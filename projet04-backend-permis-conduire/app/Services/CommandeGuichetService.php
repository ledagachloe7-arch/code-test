<?php

namespace App\Services;

use App\Exceptions\RenouvellementException;
use App\Models\CommandeGuichet;
use App\Models\CommandeGuichetLigne;
use App\Models\Dossier;
use App\Models\HPermis;
use App\Models\ModificationDemande;
use App\Models\Renouvellement;
use App\Support\SupportPermis;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Guichet usager : paiement groupé de plusieurs actions d'un même usager.
 *
 * - L'agent fait chaque action dans son onglet (dossier de digitalisation créé, demande de mise à jour créée,
 *   renouvellement ajouté au panier) ; aucune ne déclenche son propre paiement.
 * - La commande additionne les montants (calculés par le serveur), crée le renouvellement en attente,
 *   et émet un seul code de paiement (Moov : push ; Airtel : code à payer).
 * - À la confirmation du paiement, chaque action est validée : renouvellement finalisé (dates calculées),
 *   paiement enregistré sur le dossier de digitalisation, mise à jour marquée payée.
 * - Idempotent : une confirmation répétée ne change rien ; un objet n'est payé que par une seule commande active.
 */
class CommandeGuichetService
{
    public const MSG_EN_ATTENTE = 'Paiement groupé en attente de confirmation.';

    public function __construct(
        protected RenouvellementService $renouvellementService,
        protected PaiementMoovService $moovService,
        protected PaiementAirtelService $airtelService,
        protected PaiementHistoriqueService $paiementHistoriqueService
    ) {
    }

    // ------------------------------------------------------------------
    // Montants
    // ------------------------------------------------------------------

    private function montantConfig(string $cle, string $variable): float
    {
        $valeur = config("guichet.{$cle}");
        if ($valeur === null || $valeur === '' || (float) $valeur <= 0) {
            throw new RenouvellementException("Montant non configuré ({$variable}).", 500);
        }

        return (float) $valeur;
    }

    /**
     * Détail des lignes et montant total, sans rien enregistrer.
     *
     * @param array<int, array{type: string, h_permis_id?: string, objet_id?: string}> $lignes
     * @return array{titulaire: HPermis, support: string, lignes: array<int, array>, montant_total: float, devise: string}
     */
    public function devis(string $hPermisId, array $lignes): array
    {
        $titulaire = HPermis::find($hPermisId);
        if (! $titulaire) {
            throw new RenouvellementException('Usager introuvable.', 404);
        }
        $support = SupportPermis::de($titulaire);

        if ($lignes === []) {
            throw new RenouvellementException('Aucune action à payer.', 422);
        }

        $detail = [];
        $vus = [];
        foreach ($lignes as $l) {
            $type = strtoupper((string) ($l['type'] ?? ''));
            $objetId = $l['objet_id'] ?? null;
            $cle = $type . ':' . ($objetId ?? '');
            if (isset($vus[$cle])) {
                continue; // doublon envoyé par le navigateur : compté une seule fois
            }
            $vus[$cle] = true;

            switch ($type) {
                case CommandeGuichetLigne::TYPE_RENOUVELLEMENT:
                    $etat = $this->renouvellementService->etat($hPermisId);
                    if (! $etat['renouvelable']) {
                        throw new RenouvellementException('Renouvellement : ' . $etat['message'], 422);
                    }
                    $detail[] = [
                        'type' => $type,
                        'objet_id' => null,
                        'libelle' => 'Renouvellement (' . collect($etat['categories_a_renouveler'])->implode(', ') . ')',
                        'montant' => (float) $etat['montant_total'],
                    ];
                    break;

                case CommandeGuichetLigne::TYPE_DIGITALISATION:
                    $dossier = $this->dossierDigitalisation($objetId, $support);
                    $detail[] = [
                        'type' => $type,
                        'objet_id' => $dossier->id,
                        'libelle' => 'Digitalisation — dossier ' . ($dossier->numero ?? $dossier->id),
                        'montant' => $this->montantConfig('montant_digitalisation', 'DIGITALISATION_MONTANT'),
                    ];
                    break;

                case CommandeGuichetLigne::TYPE_MISE_A_JOUR:
                    $demande = $this->demandeMiseAJour($objetId, $titulaire, $support);
                    $detail[] = [
                        'type' => $type,
                        'objet_id' => $demande->id,
                        'libelle' => 'Mise à jour — demande ' . $demande->numero,
                        'montant' => $this->montantConfig('montant_mise_a_jour', 'MISE_A_JOUR_MONTANT'),
                    ];
                    break;

                case CommandeGuichetLigne::TYPE_DUPLICATA:
                    // Payé avant la création de la demande : rattaché au titulaire (n° d'identité + support).
                    if (empty($titulaire->numero_identite)) {
                        throw new RenouvellementException('Duplicata : le titulaire n’a pas de numéro d’identité, paiement impossible.', 422);
                    }
                    if ($this->ligneDuplicataDisponible($titulaire->numero_identite, $support)) {
                        throw new RenouvellementException('Duplicata : un paiement est déjà confirmé pour cet usager et pas encore utilisé. Créez la demande.', 409);
                    }
                    $detail[] = [
                        'type' => $type,
                        'objet_id' => null,
                        'libelle' => 'Duplicata — ' . SupportPermis::libelle($support),
                        'montant' => $this->montantDuplicata($support),
                    ];
                    break;

                default:
                    throw new RenouvellementException("Action inconnue : {$type}.", 422);
            }
        }

        if (count(array_filter($detail, fn ($d) => $d['type'] === CommandeGuichetLigne::TYPE_RENOUVELLEMENT)) > 1) {
            throw new RenouvellementException('Un seul renouvellement par paiement.', 422);
        }
        if (count(array_filter($detail, fn ($d) => $d['type'] === CommandeGuichetLigne::TYPE_DUPLICATA)) > 1) {
            throw new RenouvellementException('Un seul duplicata par paiement.', 422);
        }

        return [
            'titulaire' => $titulaire,
            'support' => $support,
            'lignes' => $detail,
            'montant_total' => array_sum(array_column($detail, 'montant')),
            'devise' => (string) config('guichet.devise'),
        ];
    }

    private function dossierDigitalisation(?string $dossierId, string $support): Dossier
    {
        $dossier = $dossierId ? Dossier::with('typeDemande')->find($dossierId) : null;
        if (! $dossier) {
            throw new RenouvellementException('Digitalisation : dossier introuvable. Enregistrez d’abord le dossier.', 422);
        }
        $attendu = config('duplicata.types_demande')[$support] ?? null;
        $normaliser = fn ($v) => strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $v));
        if ($attendu && $normaliser($dossier->typeDemande?->name) !== $normaliser($attendu)) {
            throw new RenouvellementException('Digitalisation : ce dossier n’est pas un dossier de digitalisation '
                . SupportPermis::libelle($support) . '.', 422);
        }
        $this->verifierNonDejaPaye(CommandeGuichetLigne::TYPE_DIGITALISATION, $dossier->id, 'ce dossier de digitalisation');

        return $dossier;
    }

    private function demandeMiseAJour(?string $demandeId, HPermis $titulaire, string $support): ModificationDemande
    {
        $demande = $demandeId ? ModificationDemande::find($demandeId) : null;
        if (! $demande) {
            throw new RenouvellementException('Mise à jour : demande introuvable.', 422);
        }
        if ($demande->numero_identite !== $titulaire->numero_identite || ($demande->support ?? SupportPermis::ROSE) !== $support) {
            throw new RenouvellementException('Mise à jour : la demande ne concerne pas cet usager.', 422);
        }
        if (! in_array($demande->statut, [ModificationDemande::STATUT_BROUILLON, ModificationDemande::STATUT_SOUMISE], true)) {
            throw new RenouvellementException("Mise à jour : la demande {$demande->numero} est déjà traitée ({$demande->statut}).", 422);
        }
        $this->verifierNonDejaPaye(CommandeGuichetLigne::TYPE_MISE_A_JOUR, $demande->id, "la demande {$demande->numero}");

        return $demande;
    }

    private function montantDuplicata(string $support): float
    {
        $fiche = config('guichet.montant_duplicata_fiche');
        if ($support === SupportPermis::VERT && $fiche !== null && $fiche !== '' && (float) $fiche > 0) {
            return (float) $fiche;
        }

        return $this->montantConfig('montant_duplicata', 'DUPLICATA_MONTANT');
    }

    /**
     * Ligne DUPLICATA payée et pas encore utilisée par une demande, pour ce titulaire et ce support.
     * $verrouiller : à utiliser dans la transaction de création du duplicata (évite qu'un paiement serve deux fois).
     */
    public function ligneDuplicataDisponible(?string $numeroIdentite, string $support, bool $verrouiller = false): ?CommandeGuichetLigne
    {
        if (empty($numeroIdentite)) {
            return null;
        }
        $q = CommandeGuichetLigne::query()
            ->where('type', CommandeGuichetLigne::TYPE_DUPLICATA)
            ->where('statut', CommandeGuichetLigne::STATUT_PAYE)
            // Pas encore utilisée : objet_id est encore le jeton, pas l'id d'une demande de duplicata.
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('duplicata_demandes')
                ->whereColumn('duplicata_demandes.id', 'commande_guichet_lignes.objet_id'))
            ->whereIn('commande_guichet_id', CommandeGuichet::query()->select('id')
                ->where('statut', CommandeGuichet::STATUT_CONFIRME)
                ->where('numero_identite', $numeroIdentite)
                ->where('support', $support))
            ->orderBy('created_at');

        return ($verrouiller ? $q->lockForUpdate() : $q)->first();
    }

    /** Dernière commande de duplicata encore en attente de paiement pour ce titulaire (reprise après rechargement). */
    public function commandeDuplicataEnAttente(?string $numeroIdentite, string $support): ?CommandeGuichet
    {
        if (empty($numeroIdentite)) {
            return null;
        }

        return CommandeGuichet::with('lignes')
            ->where('statut', CommandeGuichet::STATUT_EN_ATTENTE)
            ->where('numero_identite', $numeroIdentite)
            ->where('support', $support)
            ->whereHas('lignes', fn ($q) => $q->where('type', CommandeGuichetLigne::TYPE_DUPLICATA))
            ->latest()
            ->first();
    }

    /**
     * Rattache le paiement à la demande de duplicata qui vient d'être créée (dans sa transaction)
     * et l'enregistre dans l'historique des paiements du dossier.
     */
    public function consommerDuplicata(CommandeGuichetLigne $ligne, string $duplicataId, Dossier $dossier): void
    {
        $ligne->forceFill(['objet_id' => $duplicataId])->save();
        $c = CommandeGuichet::find($ligne->commande_guichet_id);
        $this->paiementHistoriqueService->creerPaiement([
            'dossier_id' => $dossier->id,
            'code_paiement' => $c->code_paiement . '-DUP',
            'reference_paiement' => $c->reference_paiement ?: 'GCH-' . $c->id,
            'montant' => $ligne->montant,
            'nom' => $c->nom ?? '',
            'prenom' => $c->prenom ?? '',
        ]);
    }

    private function verifierNonDejaPaye(string $type, string $objetId, string $libelle): void
    {
        $existe = CommandeGuichetLigne::where('type', $type)->where('objet_id', $objetId)
            ->where('statut', '<>', CommandeGuichetLigne::STATUT_ECHOUE)->exists();
        if ($existe) {
            throw new RenouvellementException("Un paiement existe déjà pour {$libelle}.", 409);
        }
    }

    // ------------------------------------------------------------------
    // Création + déclenchement du paiement
    // ------------------------------------------------------------------

    /**
     * @param object|null $agent Utilisateur authentifié (id, email)
     * @return array{commande: CommandeGuichet, paiement: array}
     */
    public function creer(string $hPermisId, array $lignes, string $operateur, ?string $telephone, $agent): array
    {
        $operateur = strtoupper($operateur);
        if (! in_array($operateur, [CommandeGuichet::OPERATEUR_MOOV, CommandeGuichet::OPERATEUR_AIRTEL], true)) {
            throw new RenouvellementException('Opérateur de paiement invalide (MOOV ou AIRTEL).', 422);
        }
        if ($operateur === CommandeGuichet::OPERATEUR_MOOV && empty($telephone)) {
            throw new RenouvellementException('Le numéro de téléphone est obligatoire pour un paiement Moov.', 422);
        }

        $commande = DB::transaction(function () use ($hPermisId, $lignes, $operateur, $telephone, $agent) {
            $devis = $this->devis($hPermisId, $lignes);
            if ($devis['montant_total'] <= 0) {
                throw new RenouvellementException('Montant total nul : rien à payer.', 422);
            }
            $titulaire = $devis['titulaire'];

            $c = new CommandeGuichet();
            $c->forceFill([
                'numero' => 'GCH-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'numero_identite' => $titulaire->numero_identite,
                'support' => $devis['support'],
                'nom' => $titulaire->nom,
                'prenom' => $titulaire->prenom,
                'statut' => CommandeGuichet::STATUT_EN_ATTENTE,
                'operateur' => $operateur,
                'code_paiement' => 'GCH' . strtoupper(Str::random(10)),
                'montant' => $devis['montant_total'],
                'telephone' => $telephone,
                'agent_id' => $agent->id ?? null,
                'agent_email' => $agent->email ?? null,
            ])->save();

            foreach ($devis['lignes'] as $d) {
                $objetId = $d['objet_id'];
                $montant = $d['montant'];
                if ($d['type'] === CommandeGuichetLigne::TYPE_RENOUVELLEMENT) {
                    // Demande créée en attente, sans paiement propre : payée par cette commande.
                    $r = $this->renouvellementService->creerDemande($hPermisId, $operateur, $telephone, $agent);
                    $objetId = $r->id;
                    $montant = (float) $r->montant;
                }
                if ($d['type'] === CommandeGuichetLigne::TYPE_DUPLICATA) {
                    // Jeton provisoire : remplacé par l'id de la demande de duplicata quand elle est créée.
                    $objetId = (string) Str::uuid();
                }
                (new CommandeGuichetLigne())->forceFill([
                    'commande_guichet_id' => $c->id,
                    'type' => $d['type'],
                    'objet_id' => $objetId,
                    'libelle' => $d['libelle'],
                    'montant' => $montant,
                    'statut' => CommandeGuichetLigne::STATUT_EN_ATTENTE,
                ])->save();
            }

            // Le montant du renouvellement est celui réellement enregistré (même calcul, au même instant).
            $c->forceFill(['montant' => CommandeGuichetLigne::where('commande_guichet_id', $c->id)->sum('montant')])->save();

            return $c->load('lignes');
        });

        Log::info('[Guichet] Commande créée', [
            'commande_id' => $commande->id,
            'numero_identite' => $commande->numero_identite,
            'lignes' => $commande->lignes->pluck('type')->all(),
            'montant' => (string) $commande->montant,
            'operateur' => $operateur,
            'agent_id' => $agent->id ?? null,
        ]);

        $paiement = ['success' => true, 'message' => 'Commande enregistrée. Paiement en attente.'];
        if ($operateur === CommandeGuichet::OPERATEUR_MOOV) {
            $paiement = $this->moovService->envoyerInitTrans(
                'G_' . $commande->id,
                trim((string) $telephone),
                (float) $commande->montant,
                (string) config('guichet.devise'),
                (string) $commande->id,
                (string) $commande->code_paiement
            );
            unset($paiement['raw']);

            if (! $paiement['success']) {
                $this->echouer($commande->id, 'Échec initiation Moov : ' . ($paiement['message'] ?? ''));
                $commande->refresh()->load('lignes');
            }
        } else {
            $paiement['message'] = 'Commande enregistrée. L’usager doit payer ' . number_format((float) $commande->montant, 0, ',', ' ')
                . ' ' . config('guichet.devise') . ' via Airtel Money avec le code ' . $commande->code_paiement . '.';
        }

        return ['commande' => $commande, 'paiement' => $paiement];
    }

    // ------------------------------------------------------------------
    // Confirmation / échec
    // ------------------------------------------------------------------

    /**
     * Paiement confirmé : valide chaque action de la commande. Idempotent.
     */
    public function confirmerPaiement(string $commandeId, ?string $referencePaiement): ?CommandeGuichet
    {
        return DB::transaction(function () use ($commandeId, $referencePaiement) {
            $c = CommandeGuichet::whereKey($commandeId)->lockForUpdate()->first();
            if (! $c) {
                return null;
            }
            if ($c->statut !== CommandeGuichet::STATUT_EN_ATTENTE) {
                return $c->load('lignes');
            }

            $reference = $referencePaiement ?: 'GCH-' . $c->id;
            $c->forceFill([
                'statut' => CommandeGuichet::STATUT_CONFIRME,
                'reference_paiement' => $reference,
                'date_confirmation_paiement' => now(),
            ])->save();

            foreach ($c->lignes()->lockForUpdate()->get() as $i => $l) {
                if ($l->statut === CommandeGuichetLigne::STATUT_PAYE) {
                    continue;
                }
                switch ($l->type) {
                    case CommandeGuichetLigne::TYPE_RENOUVELLEMENT:
                        $this->renouvellementService->confirmerPaiement($l->objet_id, $reference);
                        break;

                    case CommandeGuichetLigne::TYPE_DIGITALISATION:
                        $dossier = Dossier::with('candidat.personne')->find($l->objet_id);
                        if ($dossier) {
                            // Code propre à la ligne : la table paiements est unique sur (code, référence).
                            $this->paiementHistoriqueService->creerPaiement([
                                'dossier_id' => $dossier->id,
                                'code_paiement' => $c->code_paiement . '-' . ($i + 1),
                                'reference_paiement' => $reference,
                                'montant' => $l->montant,
                                'nom' => $dossier->candidat?->personne?->nom ?? $c->nom ?? '',
                                'prenom' => $dossier->candidat?->personne?->prenom ?? $c->prenom ?? '',
                            ]);
                        }
                        break;

                    case CommandeGuichetLigne::TYPE_MISE_A_JOUR:
                        // Rien d'autre à faire : la demande suit sa validation habituelle, payée via cette ligne.
                        break;

                    case CommandeGuichetLigne::TYPE_DUPLICATA:
                        // La demande n'existe pas encore : la ligne payée débloque sa création (consommerDuplicata).
                        break;
                }
                $l->forceFill(['statut' => CommandeGuichetLigne::STATUT_PAYE])->save();
            }

            Log::info('[Guichet] Paiement confirmé', ['commande_id' => $c->id, 'reference' => $reference]);

            return $c->load('lignes');
        });
    }

    /**
     * Paiement échoué : la commande et son renouvellement sont abandonnés ; les objets peuvent être repayés.
     */
    public function echouer(string $commandeId, string $motif): void
    {
        $renouvellements = DB::transaction(function () use ($commandeId, $motif) {
            $c = CommandeGuichet::whereKey($commandeId)->lockForUpdate()->first();
            if (! $c || $c->statut !== CommandeGuichet::STATUT_EN_ATTENTE) {
                return collect();
            }
            $c->forceFill(['statut' => CommandeGuichet::STATUT_ECHOUE, 'motif_echec' => mb_substr($motif, 0, 255)])->save();
            CommandeGuichetLigne::where('commande_guichet_id', $c->id)
                ->update(['statut' => CommandeGuichetLigne::STATUT_ECHOUE, 'updated_at' => now()]);

            return CommandeGuichetLigne::where('commande_guichet_id', $c->id)
                ->where('type', CommandeGuichetLigne::TYPE_RENOUVELLEMENT)->pluck('objet_id');
        });

        foreach ($renouvellements as $id) {
            $this->renouvellementService->echouer($id, 'Paiement groupé échoué : ' . $motif);
        }

        Log::warning('[Guichet] Paiement échoué', ['commande_id' => $commandeId, 'motif' => $motif]);
    }

    /**
     * Vérifie auprès de Paynala (Airtel) une commande en attente.
     */
    public function verifierPaiementAirtel(CommandeGuichet $c): CommandeGuichet
    {
        if ($c->statut !== CommandeGuichet::STATUT_EN_ATTENTE || $c->operateur !== CommandeGuichet::OPERATEUR_AIRTEL) {
            return $c->load('lignes');
        }

        $result = (config('services.paynala.simulation') && app()->environment('local'))
            ? ['success' => true, 'count' => 1, 'data' => ['payments' => [['status' => 'SUCCESS', 'airtel_money_id' => 'SIMULATION-' . $c->id]]]]
            : $this->airtelService->lookupPayment($c->code_paiement);

        $paiement = $result['data']['payments'][0] ?? null;
        if (($result['success'] ?? false) && (int) ($result['count'] ?? 0) > 0 && ($paiement['status'] ?? null) === 'SUCCESS') {
            return $this->confirmerPaiement($c->id, $paiement['airtel_money_id'] ?? null) ?? $c;
        }

        return $c->load('lignes');
    }

    public function verifierPaiementsAirtelEnAttente(): void
    {
        CommandeGuichet::where('statut', CommandeGuichet::STATUT_EN_ATTENTE)
            ->where('operateur', CommandeGuichet::OPERATEUR_AIRTEL)
            ->orderBy('created_at')
            ->each(function (CommandeGuichet $c) {
                try {
                    $this->verifierPaiementAirtel($c);
                } catch (\Throwable $e) {
                    Log::error('[Guichet] Vérification Airtel en échec', ['id' => $c->id, 'error' => $e->getMessage()]);
                }
            });
    }

    /** Lignes d'une commande prêtes pour l'affichage. */
    public static function presenter(CommandeGuichet $c): array
    {
        return $c->toArray() + ['devise' => (string) config('guichet.devise')];
    }

    /** @return Collection<int, CommandeGuichet> */
    public function historique(?string $numeroIdentite): Collection
    {
        return $numeroIdentite
            ? CommandeGuichet::with('lignes')->where('numero_identite', $numeroIdentite)->latest()->limit(10)->get()
            : collect();
    }
}
