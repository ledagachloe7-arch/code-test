<?php

namespace App\Services;

use App\Exceptions\ModificationException;
use App\Models\HPermis;
use App\Models\ModificationDemande;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Mise à jour des informations personnelles (cahier des charges §4-7).
 *
 * Circuit : Brouillon → Soumise → Approuvée (donnée active mise à jour) | Rejetée (dossier inchangé).
 * - L'agent ne modifie jamais directement les données : il soumet une demande.
 * - Un responsable habilité, distinct du demandeur, approuve ou rejette (motif obligatoire en cas de rejet).
 * - L'ancienne valeur est conservée dans la demande (historique non modifiable).
 */
class ModificationDemandeService
{
    // ------------------------------------------------------------------
    // Titulaire
    // ------------------------------------------------------------------

    /** Toutes les lignes h_permis (catégories) du titulaire auquel appartient ce permis. */
    public function lignesDuTitulaire(string $hPermisId, bool $verrouiller = false): Collection
    {
        $permis = HPermis::find($hPermisId);
        if (! $permis) {
            throw new ModificationException('Permis introuvable.', 404);
        }

        $query = HPermis::query();
        if (! empty($permis->numero_identite)) {
            $query->where('numero_identite', $permis->numero_identite);
        } else {
            $query->whereKey($permis->id);
        }
        if ($verrouiller) {
            $query->lockForUpdate();
        }

        return $query->orderBy('categorie')->get();
    }

    private function lignesParIdentite(string $numeroIdentite, bool $verrouiller = false): Collection
    {
        $query = HPermis::where('numero_identite', $numeroIdentite);
        if ($verrouiller) {
            $query->lockForUpdate();
        }
        return $query->get();
    }

    public static function age(?string $dateNaissance): ?int
    {
        return $dateNaissance ? (int) Carbon::parse($dateNaissance)->diffInYears(Carbon::today()) : null;
    }

    public function valeurActuelle(HPermis $p, string $champ): ?string
    {
        $v = $p->{$champ};
        if ($v === null) {
            return null;
        }
        return $champ === 'date_naissance' ? Carbon::parse($v)->toDateString() : (string) $v;
    }

    public function fiche(string $hPermisId, $agent): array
    {
        $lignes = $this->lignesDuTitulaire($hPermisId);
        $t = $lignes->first();

        return [
            'h_permis_id' => $t->id,
            'titulaire' => [
                'numero_identite' => $t->numero_identite,
                'nom' => $t->nom,
                'prenom' => $t->prenom,
                'date_naissance' => $this->valeurActuelle($t, 'date_naissance'),
                'age' => self::age($t->date_naissance),
                'lieu_naissance' => $t->lieu_naissance,
                'nationalite' => $t->nationalite,
                'sexe' => $t->sexe,
            ],
            'permis' => $lignes->map(fn (HPermis $p) => [
                'h_permis_id' => $p->id,
                'numero_permis' => $p->numero_permis,
                'categorie' => $p->categorie,
                'date_validite' => $p->date_validite,
            ])->values(),
            'champs' => config('modifications.champs'),
            'demandes' => ModificationDemande::where('numero_identite', $t->numero_identite)
                ->orderByDesc('created_at')->get(),
            'peut_valider' => $this->estValidateur($agent),
        ];
    }

    // ------------------------------------------------------------------
    // Droits
    // ------------------------------------------------------------------

    private static function role($agent): string
    {
        return strtoupper((string) ($agent->role ?? ''));
    }

    private static function roleDans($agent, array $roles): bool
    {
        return in_array(self::role($agent), array_map('strtoupper', $roles), true);
    }

    public function peutDemander($agent): bool
    {
        return $agent !== null && ! self::roleDans($agent, config('modifications.roles_exclus'));
    }

    public function estValidateur($agent): bool
    {
        return $agent !== null && self::roleDans($agent, config('modifications.roles_validateurs'));
    }

    /** Raison du refus, ou null si l'agent peut décider sur cette demande. */
    public function refusDecision($agent, ModificationDemande $d): ?string
    {
        if (! $this->estValidateur($agent)) {
            return "Vous n'êtes pas habilité à valider les demandes de modification.";
        }
        if ($d->champ === 'date_naissance' && ! self::roleDans($agent, config('modifications.roles_validateurs_date_naissance'))) {
            return 'La modification de la date de naissance requiert une validation renforcée (profil habilité : '
                . implode(', ', config('modifications.roles_validateurs_date_naissance')) . ').';
        }
        if ($d->demandeur_id !== null && (string) $d->demandeur_id === (string) ($agent->id ?? '')) {
            return 'Séparation des tâches : le demandeur ne peut pas valider sa propre demande.';
        }
        return null;
    }

    public function peutVoirJustificatif($agent, ModificationDemande $d): bool
    {
        return $this->estValidateur($agent)
            || ($d->demandeur_id !== null && (string) $d->demandeur_id === (string) ($agent->id ?? ''));
    }

    private function exigerDemandeur($agent): void
    {
        if (! $this->peutDemander($agent)) {
            throw new ModificationException("Votre profil ne permet pas d'initier une demande de modification.", 403);
        }
    }

    private function exigerAuteur($agent, ModificationDemande $d): void
    {
        if ((string) $d->demandeur_id !== (string) ($agent->id ?? '')) {
            throw new ModificationException('Seul le demandeur peut modifier ou soumettre ce brouillon.', 403);
        }
        if ($d->statut !== ModificationDemande::STATUT_BROUILLON) {
            throw new ModificationException('Seul un brouillon peut être modifié.', 422);
        }
    }

    // ------------------------------------------------------------------
    // Saisie
    // ------------------------------------------------------------------

    /**
     * Contrôle et normalise la nouvelle valeur selon le champ.
     *
     * @return array{0: string, 1: array|null} [nouvelle_valeur, details]
     */
    public function normaliserValeur(string $champ, array $data): array
    {
        if (! array_key_exists($champ, config('modifications.champs'))) {
            throw new ModificationException('Champ non modifiable.', 422);
        }

        switch ($champ) {
            case 'nom':
            case 'prenom':
                $v = trim((string) ($data['nouvelle_valeur'] ?? ''));
                if ($v === '' || mb_strlen($v) > 50) {
                    throw new ModificationException('La nouvelle valeur est obligatoire (50 caractères maximum).', 422);
                }
                return [$champ === 'nom' ? mb_strtoupper($v) : $v, null];

            case 'date_naissance':
                try {
                    $d = Carbon::parse((string) ($data['nouvelle_valeur'] ?? ''))->startOfDay();
                } catch (\Throwable) {
                    throw new ModificationException('Date de naissance invalide.', 422);
                }
                if (empty($data['nouvelle_valeur']) || $d->isFuture()) {
                    throw new ModificationException('Date de naissance invalide.', 422);
                }
                return [$d->toDateString(), null];

            case 'lieu_naissance':
                $ville = trim((string) ($data['ville'] ?? ''));
                $province = trim((string) ($data['province'] ?? ''));
                $pays = trim((string) ($data['pays'] ?? ''));
                if ($ville === '' || $pays === '') {
                    throw new ModificationException('La ville/localité et le pays sont obligatoires.', 422);
                }
                if (mb_strlen($ville) > 100) {
                    throw new ModificationException('Ville/localité : 100 caractères maximum.', 422);
                }
                return [$ville, ['ville' => $ville, 'province' => $province ?: null, 'pays' => $pays]];

            case 'nationalite':
                $v = trim((string) ($data['nouvelle_valeur'] ?? ''));
                if ($v === '' || mb_strlen($v) > 30) {
                    throw new ModificationException('La nouvelle nationalité est obligatoire (30 caractères maximum).', 422);
                }
                return [$v, null];
        }

        throw new ModificationException('Champ non modifiable.', 422);
    }

    private function stockerJustificatif(ModificationDemande $d, UploadedFile $fichier): void
    {
        $disk = Storage::disk(config('modifications.disk'));
        $ext = strtolower($fichier->getClientOriginalExtension() ?: $fichier->extension());
        $chemin = $disk->putFileAs(
            'justificatifs-modifications/' . now()->format('Y/m'),
            $fichier,
            $d->id . '_' . strtolower(Str::random(6)) . '.' . $ext
        );

        // L'ancien fichier n'est supprimé qu'après validation de la transaction ; le nouveau l'est en cas d'échec.
        $this->fichiersNouveaux[] = $chemin;
        if ($d->justificatif_path) {
            $this->fichiersRemplaces[] = $d->justificatif_path;
        }

        $d->forceFill([
            'justificatif_path' => $chemin,
            'justificatif_nom' => mb_substr($fichier->getClientOriginalName(), 0, 255),
            'justificatif_mime' => $fichier->getMimeType(),
        ]);
    }

    /** Fichiers écrits / remplacés pendant la transaction en cours. */
    private array $fichiersNouveaux = [];
    private array $fichiersRemplaces = [];

    /**
     * Exécute $operation en transaction et garde le stockage cohérent avec la base :
     * succès → suppression des fichiers remplacés ; échec → suppression des fichiers nouvellement écrits.
     */
    private function transactionAvecFichiers(callable $operation): ModificationDemande
    {
        $this->fichiersNouveaux = [];
        $this->fichiersRemplaces = [];
        $disk = Storage::disk(config('modifications.disk'));

        try {
            $resultat = DB::transaction($operation);
        } catch (\Throwable $e) {
            foreach ($this->fichiersNouveaux as $f) {
                $disk->delete($f);
            }
            throw $e;
        }

        foreach ($this->fichiersRemplaces as $f) {
            $disk->delete($f);
        }

        return $resultat;
    }

    /**
     * Crée une demande (brouillon), puis la soumet si demandé.
     */
    public function creer(string $hPermisId, array $data, ?UploadedFile $justificatif, $agent, bool $soumettre): ModificationDemande
    {
        // Création + soumission atomiques : si la soumission est refusée, aucun brouillon ni fichier ne reste.
        return $this->transactionAvecFichiers(fn () => $this->creerSansTransaction($hPermisId, $data, $justificatif, $agent, $soumettre));
    }

    private function creerSansTransaction(string $hPermisId, array $data, ?UploadedFile $justificatif, $agent, bool $soumettre): ModificationDemande
    {
        $this->exigerDemandeur($agent);

        $champ = (string) ($data['champ'] ?? '');
        [$nouvelle, $details] = $this->normaliserValeur($champ, $data);

        $titulaire = $this->lignesDuTitulaire($hPermisId)->first();
        $ancienne = $this->valeurActuelle($titulaire, $champ);
        if ($ancienne !== null && mb_strtolower($ancienne) === mb_strtolower($nouvelle) && $champ !== 'lieu_naissance') {
            throw new ModificationException('La nouvelle valeur est identique à la valeur actuelle.', 422);
        }

        $d = new ModificationDemande();
        $d->forceFill([
            'id' => (string) Str::uuid(),
            'numero' => 'MOD-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
            'numero_identite' => $titulaire->numero_identite,
            'numero_permis' => $titulaire->numero_permis,
            'nom_titulaire' => $titulaire->nom,
            'prenom_titulaire' => $titulaire->prenom,
            'champ' => $champ,
            'ancienne_valeur' => $ancienne,
            'nouvelle_valeur' => $nouvelle,
            'details' => $details,
            'motif' => trim((string) ($data['motif'] ?? '')),
            'statut' => ModificationDemande::STATUT_BROUILLON,
            'demandeur_id' => $agent->id ?? null,
            'demandeur_email' => $agent->email ?? null,
        ]);
        if ($justificatif) {
            $this->stockerJustificatif($d, $justificatif);
        }
        $d->save();

        Log::info('[Modification] Brouillon créé', ['id' => $d->id, 'numero' => $d->numero, 'champ' => $champ, 'agent_id' => $agent->id ?? null]);

        return $soumettre ? $this->soumettre($d->id, $agent) : $d;
    }

    public function modifierBrouillon(string $id, array $data, ?UploadedFile $justificatif, $agent, bool $soumettre): ModificationDemande
    {
        return $this->transactionAvecFichiers(fn () => $this->modifierBrouillonSansTransaction($id, $data, $justificatif, $agent, $soumettre));
    }

    private function modifierBrouillonSansTransaction(string $id, array $data, ?UploadedFile $justificatif, $agent, bool $soumettre): ModificationDemande
    {
        $d = ModificationDemande::find($id) ?? throw new ModificationException('Demande introuvable.', 404);
        $this->exigerAuteur($agent, $d);

        $champ = (string) ($data['champ'] ?? $d->champ);
        [$nouvelle, $details] = $this->normaliserValeur($champ, $data);

        $titulaire = $this->lignesParIdentite($d->numero_identite)->first();
        $d->forceFill([
            'champ' => $champ,
            'ancienne_valeur' => $titulaire ? $this->valeurActuelle($titulaire, $champ) : $d->ancienne_valeur,
            'nouvelle_valeur' => $nouvelle,
            'details' => $details,
            'motif' => trim((string) ($data['motif'] ?? $d->motif)),
        ]);
        if ($justificatif) {
            $this->stockerJustificatif($d, $justificatif);
        }
        $d->save();

        return $soumettre ? $this->soumettre($d->id, $agent) : $d;
    }

    public function supprimerBrouillon(string $id, $agent): void
    {
        $d = ModificationDemande::find($id) ?? throw new ModificationException('Demande introuvable.', 404);
        $this->exigerAuteur($agent, $d);
        if ($d->justificatif_path) {
            Storage::disk(config('modifications.disk'))->delete($d->justificatif_path);
        }
        $d->delete();
        Log::info('[Modification] Brouillon supprimé', ['id' => $id, 'agent_id' => $agent->id ?? null]);
    }

    /**
     * Contrôle (champs obligatoires et pièces) puis soumission : date/heure serveur et agent demandeur.
     */
    public function soumettre(string $id, $agent): ModificationDemande
    {
        return DB::transaction(function () use ($id, $agent) {
            $d = ModificationDemande::whereKey($id)->lockForUpdate()->first() ?? throw new ModificationException('Demande introuvable.', 404);
            $this->exigerAuteur($agent, $d);

            $manquants = [];
            if (trim((string) $d->nouvelle_valeur) === '') {
                $manquants[] = 'nouvelle valeur';
            }
            if (trim((string) $d->motif) === '') {
                $manquants[] = 'motif';
            }
            if (empty($d->justificatif_path)) {
                $manquants[] = 'justificatif officiel';
            }
            if ($manquants) {
                throw new ModificationException('Champs obligatoires manquants : ' . implode(', ', $manquants) . '.', 422);
            }

            $dejaSoumise = ModificationDemande::where('numero_identite', $d->numero_identite)
                ->where('champ', $d->champ)
                ->where('statut', ModificationDemande::STATUT_SOUMISE)
                ->exists();
            if ($dejaSoumise) {
                throw new ModificationException("Une demande de modification « {$d->champ_libelle} » est déjà en attente de validation pour ce titulaire.", 409);
            }

            $d->forceFill([
                'statut' => ModificationDemande::STATUT_SOUMISE,
                'date_soumission' => now(),
            ])->save();

            Log::info('[Modification] Demande soumise', ['id' => $d->id, 'numero' => $d->numero, 'champ' => $d->champ, 'agent_id' => $agent->id ?? null]);

            return $d;
        });
    }

    // ------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------

    public function aValider($agent)
    {
        return ModificationDemande::where('statut', ModificationDemande::STATUT_SOUMISE)
            ->orderBy('date_soumission')
            ->get()
            ->map(function (ModificationDemande $d) use ($agent) {
                $d->setAttribute('refus_decision', $this->refusDecision($agent, $d));
                return $d;
            });
    }

    /**
     * Approuve la demande et met à jour la donnée active sur toutes les catégories du titulaire.
     */
    public function approuver(string $id, $agent, ?string $commentaire): ModificationDemande
    {
        return DB::transaction(function () use ($id, $agent, $commentaire) {
            $d = ModificationDemande::whereKey($id)->lockForUpdate()->first() ?? throw new ModificationException('Demande introuvable.', 404);
            if ($d->statut !== ModificationDemande::STATUT_SOUMISE) {
                throw new ModificationException('Seule une demande soumise peut être approuvée.', 422);
            }
            if ($refus = $this->refusDecision($agent, $d)) {
                throw new ModificationException($refus, 403);
            }

            $lignes = $this->lignesParIdentite($d->numero_identite, true);
            if ($lignes->isEmpty()) {
                throw new ModificationException('Titulaire introuvable.', 404);
            }

            // La donnée a-t-elle changé depuis la demande ? Si oui, refuser l'application silencieuse.
            $actuelle = $this->valeurActuelle($lignes->first(), $d->champ);
            if ((string) $actuelle !== (string) $d->ancienne_valeur) {
                throw new ModificationException(
                    "La valeur actuelle ({$actuelle}) a changé depuis la demande ({$d->ancienne_valeur}). Rejetez cette demande et créez-en une nouvelle.",
                    409
                );
            }

            foreach ($lignes as $p) {
                $p->{$d->champ} = $d->nouvelle_valeur;
                $p->save();
            }

            $maintenant = now();
            $d->forceFill([
                'statut' => ModificationDemande::STATUT_APPROUVEE,
                'validateur_id' => $agent->id ?? null,
                'validateur_email' => $agent->email ?? null,
                'date_decision' => $maintenant,
                'date_application' => $maintenant,
                'motif_decision' => $commentaire ? trim($commentaire) : null,
            ])->save();

            Log::info('[Modification] Demande approuvée et appliquée', [
                'id' => $d->id, 'numero' => $d->numero, 'champ' => $d->champ,
                'ancienne_valeur' => $d->ancienne_valeur, 'nouvelle_valeur' => $d->nouvelle_valeur,
                'lignes_h_permis' => $lignes->count(), 'validateur_id' => $agent->id ?? null,
            ]);

            return $d;
        });
    }

    /**
     * Rejette la demande : le dossier n'est pas modifié, le motif est conservé.
     */
    public function rejeter(string $id, $agent, ?string $motif): ModificationDemande
    {
        $motif = trim((string) $motif);
        if ($motif === '') {
            throw new ModificationException('Le motif du rejet est obligatoire.', 422);
        }

        return DB::transaction(function () use ($id, $agent, $motif) {
            $d = ModificationDemande::whereKey($id)->lockForUpdate()->first() ?? throw new ModificationException('Demande introuvable.', 404);
            if ($d->statut !== ModificationDemande::STATUT_SOUMISE) {
                throw new ModificationException('Seule une demande soumise peut être rejetée.', 422);
            }
            if ($refus = $this->refusDecision($agent, $d)) {
                throw new ModificationException($refus, 403);
            }

            $d->forceFill([
                'statut' => ModificationDemande::STATUT_REJETEE,
                'validateur_id' => $agent->id ?? null,
                'validateur_email' => $agent->email ?? null,
                'date_decision' => now(),
                'motif_decision' => $motif,
            ])->save();

            Log::info('[Modification] Demande rejetée', ['id' => $d->id, 'numero' => $d->numero, 'motif' => $motif, 'validateur_id' => $agent->id ?? null]);

            return $d;
        });
    }
}
