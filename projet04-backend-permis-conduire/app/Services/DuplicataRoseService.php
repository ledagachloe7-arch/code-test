<?php

namespace App\Services;

use App\Exceptions\DuplicataException;
use App\Models\CneddtShortcode;
use App\Models\Dossier;
use App\Models\DuplicataDemande;
use App\Models\HPermis;
use App\Models\Referentiel;
use App\Models\TypeDemande;
use App\Support\SupportPermis;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Duplicata du permis rose (cadrage v1.0 du 17/11/2026) et de la fiche d'enregistrement (permis vert).
 *
 * - Shortcode : contrôlé côté serveur à partir des codes CNEDDT conservés lors des transferts (cneddt_shortcodes),
 *   rattachés au titulaire par numéro de pièce ou numéro de permis.
 * - Création : nouveau dossier lié au permis source (DUPLICATA pour le rose, DUPLICATAFICHEENREGISTREMENT pour la fiche) ;
 *   le permis source n'est jamais modifié. Une demande ne mélange jamais permis rose et fiche.
 */
class DuplicataRoseService
{
    public const SHORTCODE_ACTIF = 'ACTIF';
    public const SHORTCODE_ABSENT = 'ABSENT';
    public const SHORTCODE_NON_VERIFIE = 'NON_VERIFIE';
    public const SHORTCODE_A_REGULARISER = 'A_REGULARISER';

    // ------------------------------------------------------------------
    // Conservation des shortcodes CNEDDT
    // ------------------------------------------------------------------

    /**
     * Enregistre le shortcode renvoyé par la CNEDDT après le transfert réussi d'un dossier (idempotent par dossier).
     */
    public function enregistrerShortcodeTransfert(Dossier $dossier, string $shortcode, ?array $reponseCneddt): void
    {
        $shortcode = trim($shortcode);
        if ($shortcode === '') {
            return;
        }

        try {
            $dossier->loadMissing('candidat.personne');
            $candidat = $dossier->candidat;

            $s = CneddtShortcode::firstOrNew(['dossier_id' => $dossier->id]);
            $s->forceFill([
                'shortcode' => $shortcode,
                'statut' => CneddtShortcode::STATUT_ACTIF,
                'source' => 'TRANSFERT_CNEDDT',
                'candidat_id' => $candidat?->id,
                'numero_piece' => $candidat?->numero_piece,
                'numero_permis' => $dossier->numero_permis,
                'nom' => $candidat?->personne?->nom,
                'prenom' => $candidat?->personne?->prenom,
                'date_naissance' => $candidat?->date_naissance,
                'donnees_cneddt' => $reponseCneddt,
            ])->save();

            Log::info('[Duplicata] Shortcode CNEDDT conservé', ['dossier_id' => $dossier->id, 'candidat_id' => $candidat?->id]);
        } catch (\Throwable $e) {
            // Ne jamais faire échouer le transfert CNEDDT pour cette conservation.
            Log::error('[Duplicata] Échec conservation shortcode CNEDDT', ['dossier_id' => $dossier->id, 'error' => $e->getMessage()]);
        }
    }

    // ------------------------------------------------------------------
    // Contrôle du shortcode du titulaire
    // ------------------------------------------------------------------

    private static function normaliserNumero(?string $n): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $n));
    }

    public static function estPermisRose(HPermis $p): bool
    {
        return SupportPermis::de($p) === SupportPermis::ROSE;
    }

    /**
     * Contrôle porté sur la personne titulaire (toutes ses lignes h_permis), pas seulement sur le numéro du permis.
     *
     * @return array{statut: string, message: string, shortcode: ?CneddtShortcode}
     */
    public function controleShortcode(HPermis $permis): array
    {
        try {
            $lignes = ! empty($permis->numero_identite)
                ? HPermis::where('numero_identite', $permis->numero_identite)->get()
                : collect([$permis]);
            $numeros = $lignes->pluck('numero_permis')->filter()->map(fn ($n) => self::normaliserNumero($n))->unique()->values()->all();

            // Rattachement fort : même numéro de pièce d'identité ou un des numéros de permis du titulaire.
            $forts = CneddtShortcode::query()
                ->where(function ($q) use ($permis, $numeros) {
                    if (! empty($permis->numero_identite)) {
                        $q->orWhere('numero_piece', $permis->numero_identite);
                    }
                    if ($numeros) {
                        $q->orWhereIn(DB::raw("upper(regexp_replace(coalesce(numero_permis, ''), '[^A-Za-z0-9]', '', 'g'))"), $numeros);
                    }
                })
                ->orderByDesc('created_at')
                ->get();

            $actif = $forts->first(fn (CneddtShortcode $s) => $s->statut === CneddtShortcode::STATUT_ACTIF && $s->candidat_id);
            if ($actif) {
                return $this->resultat(self::SHORTCODE_ACTIF, 'Shortcode vérifié. Vous pouvez poursuivre la demande.', $actif);
            }
            if ($forts->isNotEmpty()) {
                $s = $forts->first();
                $raison = $s->statut !== CneddtShortcode::STATUT_ACTIF
                    ? "Shortcode présent mais au statut « {$s->statut} »."
                    : 'Shortcode présent mais non rattaché à un candidat.';
                return $this->resultat(self::SHORTCODE_A_REGULARISER, $raison . ' Une régularisation est nécessaire avant de poursuivre.', $s);
            }

            // Rattachement faible (nom + prénom + date de naissance seulement) : à confirmer, jamais automatique.
            if ($permis->date_naissance) {
                $faible = CneddtShortcode::query()
                    ->where('nom', 'ILIKE', (string) $permis->nom)
                    ->where('prenom', 'ILIKE', (string) $permis->prenom)
                    ->whereDate('date_naissance', Carbon::parse($permis->date_naissance)->toDateString())
                    ->first();
                if ($faible) {
                    return $this->resultat(
                        self::SHORTCODE_A_REGULARISER,
                        "Un shortcode existe pour une personne de même identité, mais son rattachement à ce titulaire (pièce d'identité / permis) n'est pas confirmé. Vérification nécessaire.",
                        $faible
                    );
                }
            }

            return $this->resultat(
                self::SHORTCODE_ABSENT,
                "Aucun shortcode associé à ce titulaire. L'enrôlement et le paiement sont nécessaires avant de poursuivre.",
                null
            );
        } catch (\Throwable $e) {
            Log::error('[Duplicata] Contrôle shortcode indisponible', ['h_permis_id' => $permis->id, 'error' => $e->getMessage()]);
            return $this->resultat(self::SHORTCODE_NON_VERIFIE, "Le statut du shortcode n'a pas pu être vérifié. Réessayez.", null);
        }
    }

    private function resultat(string $statut, string $message, ?CneddtShortcode $s): array
    {
        return ['statut' => $statut, 'message' => $message, 'shortcode' => $s];
    }

    // ------------------------------------------------------------------
    // Création de la demande de duplicata
    // ------------------------------------------------------------------

    /**
     * @param string[] $hPermisIds Permis sources (une ou plusieurs catégories d'un même titulaire) ; le premier est le permis principal.
     * @param object|null $agent Utilisateur authentifié (id, email, centre_id)
     * @param string|null $supportAttendu Support de l'écran (ROSE | VERT) : refus si le permis principal est d'un autre support.
     */
    public function creer(array $hPermisIds, array $data, ?UploadedFile $justificatif, $agent, ?string $supportAttendu = null): DuplicataDemande
    {
        $hPermisIds = array_values(array_unique(array_filter(array_map('strval', $hPermisIds))));
        if (count($hPermisIds) === 0) {
            throw new DuplicataException('Sélectionnez au moins un permis source.', 422);
        }
        $motif = strtoupper((string) ($data['motif'] ?? ''));
        if (! array_key_exists($motif, config('duplicata.motifs'))) {
            throw new DuplicataException('Le motif est obligatoire.', 422);
        }
        $precision = trim((string) ($data['motif_precision'] ?? ''));
        if ($motif === 'AUTRE' && $precision === '') {
            throw new DuplicataException('La précision du motif est obligatoire pour « Autre ».', 422);
        }
        if (in_array($motif, config('duplicata.motifs_justificatif_obligatoire'), true) && ! $justificatif) {
            throw new DuplicataException('Un justificatif est obligatoire pour ce motif.', 422);
        }

        $cheminFichier = null;
        try {
            $demande = DB::transaction(function () use ($hPermisIds, $motif, $precision, $data, $justificatif, $agent, $supportAttendu, &$cheminFichier) {
                // Verrou sur les permis sources : protège contre les doubles clics / soumissions simultanées.
                $tous = HPermis::whereIn('id', $hPermisIds)->lockForUpdate()->get()->keyBy('id');
                if ($tous->count() !== count($hPermisIds)) {
                    throw new DuplicataException('Permis source introuvable.', 404);
                }
                $permisSources = collect($hPermisIds)->map(fn ($id) => $tous[$id]);
                $permis = $permisSources->first(); // permis principal
                $support = SupportPermis::de($permis);

                if ($supportAttendu !== null && $support !== $supportAttendu) {
                    throw new DuplicataException(SupportPermis::messageMauvaisCircuit($permis->numero_permis, $support), 422);
                }

                $nomType = config('duplicata.types_demande')[$support] ?? null;
                $typeDemandeId = $nomType ? TypeDemande::where('name', $nomType)->value('id') : null;
                if (! $typeDemandeId) {
                    throw new DuplicataException("Type de demande {$nomType} introuvable en base.", 500);
                }

                foreach ($permisSources as $p) {
                    // Une demande ne mélange jamais permis rose et fiche d'enregistrement.
                    if (SupportPermis::de($p) !== $support) {
                        throw new DuplicataException("Le permis {$p->numero_permis} n'est pas du même type (" . SupportPermis::libelle(SupportPermis::de($p))
                            . ') : un duplicata ne mélange pas permis rose et fiche d\'enregistrement.', 422);
                    }
                    // Toutes les catégories doivent appartenir au même titulaire (jamais un homonyme).
                    $memeTitulaire = ! empty($permis->numero_identite)
                        ? $p->numero_identite === $permis->numero_identite
                        : $p->id === $permis->id;
                    if (! $memeTitulaire) {
                        throw new DuplicataException("Le permis {$p->numero_permis} n'appartient pas au même titulaire : un duplicata ne concerne qu'une seule personne.", 422);
                    }
                }

                // Anti-doublon : une catégorie ne peut figurer que dans une seule demande en cours.
                $enCours = DB::table('duplicata_demande_permis as l')
                    ->join('duplicata_demandes as d', 'd.id', '=', 'l.duplicata_demande_id')
                    ->join('dossiers', 'dossiers.id', '=', 'd.dossier_id')
                    ->whereIn('l.h_permis_id', $hPermisIds)
                    ->whereNotIn('dossiers.statut', config('duplicata.statuts_dossier_clos'))
                    ->select('l.numero_permis', 'l.categorie', 'dossiers.numero')
                    ->first();
                if ($enCours !== null) {
                    throw new DuplicataException("Une demande de duplicata est déjà en cours pour la catégorie {$enCours->categorie} (permis {$enCours->numero_permis}, dossier {$enCours->numero}).", 409);
                }

                // Contrôle shortcode recalculé côté serveur (jamais celui envoyé par le navigateur).
                $controle = $this->controleShortcode($permis);
                if ($controle['statut'] !== self::SHORTCODE_ACTIF) {
                    throw new DuplicataException($controle['message'], $controle['statut'] === self::SHORTCODE_NON_VERIFIE ? 503 : 422);
                }
                $shortcode = $controle['shortcode'];

                // Paiement obligatoire AVANT la création : une ligne DUPLICATA payée et pas encore utilisée (verrouillée).
                $guichet = app(CommandeGuichetService::class);
                $lignePaiement = $guichet->ligneDuplicataDisponible($permis->numero_identite, $support, true);
                if (! $lignePaiement) {
                    throw new DuplicataException('Le paiement du duplicata doit être confirmé avant la création de la demande.', 422);
                }

                $centreId = $agent->centre_id ?? null;
                $dossier = Dossier::create([
                    'candidat_id' => $shortcode->candidat_id,
                    'type_demande_id' => $typeDemandeId,
                    'statut' => config('duplicata.statut_initial'),
                    'utilisateur_id' => $agent->id ?? null,
                    'centre_id' => $centreId,
                    'province_id' => $centreId ? Referentiel::query()->whereKey($centreId)->value('parent_id') : null,
                    'numero_permis' => $permis->numero_permis,
                    // Fiche d'enregistrement : le transfert CNEDDT envoie aussi le numéro du permis d'origine.
                    'numero_origine_permis' => $support === SupportPermis::VERT ? $permis->numero_origine_permis : null,
                    'lieu_de_dobtention_du_permis' => $permis->lieu_obtention,
                    'date_de_dobtention_du_permis' => $permis->date_obtention,
                    'date_expiration' => $permis->date_validite,
                    'data_categorie' => $permisSources->map(fn (HPermis $p) => [
                        'classe' => $p->categorie,
                        'ville' => $p->lieu_obtention,
                        'valable_du' => $p->date_obtention,
                        'jusqu_au' => $p->date_validite,
                    ])->values()->all(),
                    'expired' => false,
                    'suspended' => false,
                ]);
                $dossier->numero = $this->numeroDossier();
                $dossier->save();

                $d = new DuplicataDemande();
                $d->forceFill([
                    'dossier_id' => $dossier->id,
                    'support' => $support,
                    'permis_source_id' => $permis->id,
                    'numero_permis_source' => $permis->numero_permis,
                    'numero_identite' => $permis->numero_identite,
                    'candidat_id' => $shortcode->candidat_id,
                    'resultat_controle_shortcode' => $controle['statut'],
                    'shortcode_id' => $shortcode->id,
                    'shortcode' => $shortcode->shortcode,
                    'motif_duplicata' => $motif,
                    'motif_precision' => $motif === 'AUTRE' ? mb_substr($precision, 0, 255) : null,
                    'observations' => mb_substr(trim((string) ($data['observations'] ?? '')), 0, (int) config('duplicata.observations_max')) ?: null,
                    'created_by' => $agent->id ?? null,
                    'created_by_email' => $agent->email ?? null,
                ]);

                if ($justificatif) {
                    $ext = strtolower($justificatif->getClientOriginalExtension() ?: $justificatif->extension());
                    $cheminFichier = Storage::disk(config('duplicata.disk'))->putFileAs(
                        'justificatifs-duplicata/' . now()->format('Y/m'),
                        $justificatif,
                        $dossier->id . '.' . $ext
                    );
                    $d->forceFill([
                        'justificatif_path' => $cheminFichier,
                        'justificatif_nom' => mb_substr($justificatif->getClientOriginalName(), 0, 255),
                        'justificatif_mime' => $justificatif->getMimeType(),
                    ]);
                }
                $d->save();

                foreach ($permisSources as $p) {
                    DB::table('duplicata_demande_permis')->insert([
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'duplicata_demande_id' => $d->id,
                        'h_permis_id' => $p->id,
                        'numero_permis' => $p->numero_permis,
                        'categorie' => $p->categorie,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Le paiement est rattaché à cette demande : il ne pourra plus servir pour une autre.
                $guichet->consommerDuplicata($lignePaiement, $d->id, $dossier);

                return $d;
            });
        } catch (\Throwable $e) {
            if ($cheminFichier) {
                Storage::disk(config('duplicata.disk'))->delete($cheminFichier);
            }
            throw $e;
        }

        Log::info('[Duplicata] Demande de duplicata créée', [
            'duplicata_id' => $demande->id,
            'support' => $demande->support,
            'dossier_id' => $demande->dossier_id,
            'permis_source_id' => $demande->permis_source_id,
            'categories' => DB::table('duplicata_demande_permis')->where('duplicata_demande_id', $demande->id)->pluck('categorie')->all(),
            'motif' => $demande->motif_duplicata,
            'agent_id' => $agent->id ?? null,
        ]);

        return $demande->load('dossier');
    }

    private function numeroDossier(): string
    {
        $l = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $c = '0123456789';
        return $l[random_int(0, 25)] . $l[random_int(0, 25)] . $c[random_int(0, 9)] . $c[random_int(0, 9)]
            . $l[random_int(0, 25)] . $c[random_int(0, 9)];
    }
}
