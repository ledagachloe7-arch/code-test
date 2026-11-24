<?php

namespace App\Services;

use App\Exceptions\RenouvellementException;
use App\Models\HPermis;
use App\Models\Renouvellement;
use App\Models\RenouvellementCategorie;
use App\Support\SupportPermis;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Règles du module Renouvellement (cahier des charges §1-3).
 *
 * - Un titulaire (h_permis.numero_identite) est affiché avec toutes ses catégories.
 * - Un renouvellement = un paiement qui couvre toutes les catégories expirées du titulaire.
 * - Une catégorie n'est renouvelable qu'à partir du lendemain de son expiration (contrôle serveur).
 * - Aucune date n'est générée tant que le paiement n'est pas confirmé.
 * - Date de délivrance = date réelle de confirmation du paiement ; expiration calculée par catégorie.
 * - Une confirmation répétée ne crée qu'un seul renouvellement (verrous + index uniques partiels).
 * - Commun au permis rose et à la fiche d'enregistrement (permis vert) : le support est déduit du permis choisi,
 *   et seules les lignes du titulaire de ce support sont traitées (SupportPermis).
 */
class RenouvellementService
{
    public const MSG_EN_ATTENTE = 'Paiement en attente de confirmation. Renouvellement non finalisé.';

    public function __construct(
        protected PaiementMoovService $moovService,
        protected PaiementAirtelService $airtelService
    ) {
    }

    // ------------------------------------------------------------------
    // Règles de calcul
    // ------------------------------------------------------------------

    public static function normaliserCategorie(?string $categorie): string
    {
        return strtoupper(trim((string) $categorie));
    }

    public function categorieSupportee(?string $categorie): bool
    {
        return array_key_exists(self::normaliserCategorie($categorie), config('renouvellement.durees'));
    }

    /**
     * Durée de validité (années) selon la catégorie et l'âge à la date effective.
     */
    public function dureeValidite(string $categorie, ?Carbon $dateNaissance, Carbon $dateEffective): int
    {
        $categorie = self::normaliserCategorie($categorie);
        $regle = config('renouvellement.durees')[$categorie] ?? null;

        if ($regle === null) {
            throw new RenouvellementException("Catégorie « {$categorie} » non prise en charge pour le renouvellement.", 422);
        }
        if (is_int($regle)) {
            return $regle;
        }
        if ($dateNaissance === null) {
            throw new RenouvellementException("Date de naissance requise pour calculer la validité de la catégorie {$categorie}.", 422);
        }

        $age = (int) $dateNaissance->diffInYears($dateEffective);
        return $age >= (int) config('renouvellement.age_seuil_senior') ? $regle['senior'] : $regle['standard'];
    }

    // ------------------------------------------------------------------
    // Titulaire et état
    // ------------------------------------------------------------------

    /** Frais par catégorie selon le support (la fiche peut avoir son propre tarif, sinon celui du permis rose). */
    public function montantParCategorie(string $support): float
    {
        $montantVert = config('renouvellement.montant_vert');
        return (float) ($support === SupportPermis::VERT && $montantVert !== null && $montantVert !== ''
            ? $montantVert
            : config('renouvellement.montant'));
    }

    /**
     * Toutes les catégories (lignes h_permis) du titulaire auquel appartient ce permis, pour le même support
     * (permis rose ou fiche d'enregistrement).
     */
    public function categoriesDuTitulaire(string $hPermisId, bool $verrouiller = false): Collection
    {
        $permis = HPermis::find($hPermisId);
        if (! $permis) {
            throw new RenouvellementException('Permis introuvable.', 404);
        }

        $query = HPermis::query();
        if (! empty($permis->numero_identite)) {
            $query->where('numero_identite', $permis->numero_identite);
            SupportPermis::filtrer($query, SupportPermis::de($permis));
        } else {
            $query->whereKey($permis->id);
        }
        if ($verrouiller) {
            $query->lockForUpdate();
        }

        return $query->orderBy('categorie')->get();
    }

    private function etatCategorie(HPermis $p, Carbon $aujourdhui): array
    {
        $expiration = $p->date_validite ? Carbon::parse($p->date_validite)->startOfDay() : null;
        $ouverture = $expiration?->copy()->addDay();
        $supportee = $this->categorieSupportee($p->categorie);
        $renouvelable = $expiration !== null && $supportee && $aujourdhui->greaterThanOrEqualTo($ouverture);

        if ($expiration === null) {
            $message = "Date d'expiration inconnue.";
        } elseif (! $supportee) {
            $message = 'Catégorie non prise en charge.';
        } elseif ($renouvelable) {
            $message = 'Expirée : à renouveler.';
        } else {
            $message = 'Valide. Renouvellement possible à partir du ' . $ouverture->format('d/m/Y') . '.';
        }

        return [
            'h_permis_id' => $p->id,
            'numero_permis' => $p->numero_permis,
            'categorie' => self::normaliserCategorie($p->categorie),
            'date_obtention' => $p->date_obtention,
            'date_expiration' => $expiration?->toDateString(),
            'date_ouverture_renouvellement' => $ouverture?->toDateString(),
            'renouvelable' => $renouvelable,
            'message' => $message,
        ];
    }

    /**
     * État de renouvellement du titulaire, avec toutes ses catégories.
     */
    public function etat(string $hPermisId): array
    {
        $lignes = $this->categoriesDuTitulaire($hPermisId);
        $titulaire = $lignes->first();
        $support = SupportPermis::de($titulaire);
        $aujourdhui = Carbon::today();

        $categories = $lignes->map(fn (HPermis $p) => $this->etatCategorie($p, $aujourdhui))->values();
        $aRenouveler = $categories->where('renouvelable', true)->values();
        $enAttente = $this->renouvellementEnAttente($titulaire->numero_identite, $support);

        if ($enAttente) {
            $message = self::MSG_EN_ATTENTE;
        } elseif ($aRenouveler->isNotEmpty()) {
            $message = 'Catégorie(s) à renouveler : ' . $aRenouveler->pluck('categorie')->implode(', ') . '.';
        } else {
            $prochaine = $categories->pluck('date_ouverture_renouvellement')->filter()->sort()->first();
            $message = $prochaine
                ? 'Votre permis est encore valide. Renouvellement possible à partir du ' . Carbon::parse($prochaine)->format('d/m/Y') . '.'
                : "Aucune catégorie renouvelable. Contactez l'administration.";
        }

        $montantUnitaire = $this->montantParCategorie($support);

        return [
            'support' => $support,
            'titulaire' => [
                'numero_identite' => $titulaire->numero_identite,
                'nom' => $titulaire->nom,
                'prenom' => $titulaire->prenom,
                'sexe' => $titulaire->sexe,
                'date_naissance' => $titulaire->date_naissance,
                'lieu_naissance' => $titulaire->lieu_naissance,
                'nationalite' => $titulaire->nationalite,
            ],
            'categories' => $categories,
            'categories_a_renouveler' => $aRenouveler->pluck('categorie'),
            'renouvelable' => $aRenouveler->isNotEmpty() && $enAttente === null,
            'message' => $message,
            'renouvellement_en_attente' => $enAttente,
            'montant_par_categorie' => $montantUnitaire,
            'montant_total' => $montantUnitaire * $aRenouveler->count(),
            'devise' => config('renouvellement.devise'),
        ];
    }

    public function renouvellementEnAttente(?string $numeroIdentite, string $support = SupportPermis::ROSE): ?Renouvellement
    {
        if (empty($numeroIdentite)) {
            return null;
        }
        return Renouvellement::with('categories')
            ->where('numero_identite', $numeroIdentite)
            ->where('support', $support)
            ->where('statut', Renouvellement::STATUT_EN_ATTENTE)
            ->first();
    }

    public function historique(string $hPermisId)
    {
        $titulaire = $this->categoriesDuTitulaire($hPermisId)->first();
        return Renouvellement::with('categories')
            ->where('numero_identite', $titulaire->numero_identite)
            ->where('support', SupportPermis::de($titulaire))
            ->orderByDesc('created_at')
            ->get();
    }

    // ------------------------------------------------------------------
    // Initiation (avant paiement)
    // ------------------------------------------------------------------

    /**
     * Enregistre la demande pour toutes les catégories expirées du titulaire et déclenche le paiement.
     * Aucune date n'est générée ici.
     *
     * @param object|null $agent Utilisateur authentifié (id, email)
     */
    public function initier(string $hPermisId, string $operateur, ?string $telephone, $agent): array
    {
        $operateur = strtoupper($operateur);
        if (! in_array($operateur, [Renouvellement::OPERATEUR_MOOV, Renouvellement::OPERATEUR_AIRTEL], true)) {
            throw new RenouvellementException('Opérateur de paiement invalide (MOOV ou AIRTEL).', 422);
        }
        if ($operateur === Renouvellement::OPERATEUR_MOOV && empty($telephone)) {
            throw new RenouvellementException('Le numéro de téléphone est obligatoire pour un paiement Moov.', 422);
        }

        $renouvellement = $this->creerDemande($hPermisId, $operateur, $telephone, $agent);

        $paiement = ['success' => true, 'message' => 'Demande enregistrée. Paiement en attente.'];

        if ($operateur === Renouvellement::OPERATEUR_MOOV) {
            $paiement = $this->moovService->envoyerInitTrans(
                'R_' . $renouvellement->id,
                trim((string) $telephone),
                (float) $renouvellement->montant,
                (string) config('renouvellement.devise'),
                (string) $renouvellement->id,
                (string) $renouvellement->code_paiement
            );
            unset($paiement['raw']);

            if (! $paiement['success']) {
                $this->echouer($renouvellement->id, 'Échec initiation Moov : ' . ($paiement['message'] ?? ''));
                $renouvellement->refresh()->load('categories');
            }
        } else {
            $paiement['message'] = 'Demande enregistrée. Le titulaire doit payer via Airtel Money avec le code '
                . $renouvellement->code_paiement . '.';
        }

        return ['renouvellement' => $renouvellement, 'paiement' => $paiement];
    }

    /**
     * Enregistre la demande (statut EN_ATTENTE_PAIEMENT) pour toutes les catégories expirées du titulaire,
     * sans déclencher de paiement. Utilisé seul par initier(), ou par le paiement groupé du guichet
     * (CommandeGuichetService), qui paie plusieurs actions avec un seul code.
     *
     * @param object|null $agent Utilisateur authentifié (id, email)
     */
    public function creerDemande(string $hPermisId, string $operateur, ?string $telephone, $agent): Renouvellement
    {
        $renouvellement = DB::transaction(function () use ($hPermisId, $operateur, $telephone, $agent) {
            $lignes = $this->categoriesDuTitulaire($hPermisId, true);
            $titulaire = $lignes->first();
            $support = SupportPermis::de($titulaire);

            $montantUnitaire = $this->montantParCategorie($support);
            if ($montantUnitaire <= 0) {
                throw new RenouvellementException('Montant du renouvellement non configuré ('
                    . ($support === SupportPermis::VERT ? 'RENOUVELLEMENT_MONTANT_FICHE ou ' : '') . 'RENOUVELLEMENT_MONTANT).', 500);
            }

            if ($this->renouvellementEnAttente($titulaire->numero_identite, $support)) {
                throw new RenouvellementException(self::MSG_EN_ATTENTE, 409);
            }

            $aujourdhui = Carbon::today();
            $aRenouveler = $lignes->filter(fn (HPermis $p) => $this->etatCategorie($p, $aujourdhui)['renouvelable'])->values();
            if ($aRenouveler->isEmpty()) {
                throw new RenouvellementException($this->etat($hPermisId)['message'], 422);
            }

            // Vérifie dès maintenant que chaque durée pourra être calculée (C/D : date de naissance requise).
            $dateNaissance = $titulaire->date_naissance ? Carbon::parse($titulaire->date_naissance) : null;
            foreach ($aRenouveler as $p) {
                $this->dureeValidite($p->categorie, $dateNaissance, $aujourdhui);
            }

            $r = new Renouvellement();
            $r->forceFill([
                'numero' => 'RNV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'numero_identite' => $titulaire->numero_identite,
                'support' => $support,
                'nom' => $titulaire->nom,
                'prenom' => $titulaire->prenom,
                'date_naissance' => $titulaire->date_naissance,
                'statut' => Renouvellement::STATUT_EN_ATTENTE,
                'operateur' => $operateur,
                'code_paiement' => 'RNV' . strtoupper(Str::random(10)),
                'montant' => $montantUnitaire * $aRenouveler->count(),
                'telephone' => $telephone,
                'agent_id' => $agent->id ?? null,
                'agent_email' => $agent->email ?? null,
            ])->save();

            foreach ($aRenouveler as $p) {
                (new RenouvellementCategorie())->forceFill([
                    'renouvellement_id' => $r->id,
                    'h_permis_id' => $p->id,
                    'numero_permis' => $p->numero_permis,
                    'categorie' => self::normaliserCategorie($p->categorie),
                    'statut' => Renouvellement::STATUT_EN_ATTENTE,
                    'ancienne_date_expiration' => Carbon::parse($p->date_validite)->toDateString(),
                ])->save();
            }

            return $r->load('categories');
        });

        Log::info('[Renouvellement] Demande initiée', [
            'renouvellement_id' => $renouvellement->id,
            'numero_identite' => $renouvellement->numero_identite,
            'support' => $renouvellement->support,
            'categories' => $renouvellement->categories->pluck('categorie')->all(),
            'operateur' => $operateur,
            'agent_id' => $agent->id ?? null,
        ]);

        return $renouvellement;
    }

    // ------------------------------------------------------------------
    // Confirmation / échec du paiement
    // ------------------------------------------------------------------

    /**
     * Finalise le renouvellement de toutes ses catégories après confirmation effective du paiement.
     * Idempotent : un 2e appel pour le même renouvellement ne change rien.
     */
    public function confirmerPaiement(string $renouvellementId, ?string $referencePaiement): ?Renouvellement
    {
        return DB::transaction(function () use ($renouvellementId, $referencePaiement) {
            /** @var Renouvellement|null $r */
            $r = Renouvellement::whereKey($renouvellementId)->lockForUpdate()->first();
            if (! $r) {
                Log::warning('[Renouvellement] Confirmation pour renouvellement inconnu', ['id' => $renouvellementId]);
                return null;
            }

            if ($r->statut === Renouvellement::STATUT_CONFIRME) {
                Log::info('[Renouvellement] Confirmation répétée ignorée', ['id' => $r->id, 'reference' => $referencePaiement]);
                return $r->load('categories');
            }
            if ($r->statut !== Renouvellement::STATUT_EN_ATTENTE) {
                Log::warning('[Renouvellement] Confirmation reçue pour un renouvellement non en attente — à traiter manuellement', [
                    'id' => $r->id, 'statut' => $r->statut, 'reference' => $referencePaiement,
                ]);
                return $r->load('categories');
            }

            $lignes = RenouvellementCategorie::where('renouvellement_id', $r->id)->get();
            $permisParId = HPermis::whereIn('id', $lignes->pluck('h_permis_id'))->lockForUpdate()->get()->keyBy('id');

            // Une échéance a-t-elle changé depuis l'initiation ? (sécurité : pas de double renouvellement)
            foreach ($lignes as $l) {
                $p = $permisParId[$l->h_permis_id] ?? null;
                $actuelle = $p?->date_validite ? Carbon::parse($p->date_validite)->toDateString() : null;
                if ($actuelle !== $l->ancienne_date_expiration->toDateString()) {
                    Log::error('[Renouvellement] Échéance modifiée depuis l\'initiation — paiement confirmé à régulariser manuellement', [
                        'id' => $r->id, 'categorie' => $l->categorie,
                        'attendue' => $l->ancienne_date_expiration->toDateString(), 'actuelle' => $actuelle,
                    ]);
                    $this->changerStatut($r, Renouvellement::STATUT_ANNULE, [
                        'reference_paiement' => $referencePaiement,
                        'date_confirmation_paiement' => now(),
                        'motif_echec' => "Échéance de la catégorie {$l->categorie} déjà modifiée : paiement confirmé à régulariser manuellement.",
                    ]);
                    return $r->load('categories');
                }
            }

            $confirmation = now();
            $delivrance = $confirmation->copy()->startOfDay();
            $dateNaissance = $r->date_naissance ? Carbon::parse($r->date_naissance) : null;
            $age = $dateNaissance ? (int) $dateNaissance->diffInYears($delivrance) : null;

            foreach ($lignes as $l) {
                $duree = $this->dureeValidite($l->categorie, $dateNaissance, $delivrance);
                $expiration = $delivrance->copy()->addYears($duree);

                $l->forceFill([
                    'statut' => Renouvellement::STATUT_CONFIRME,
                    'nouvelle_date_delivrance' => $delivrance->toDateString(),
                    'nouvelle_date_expiration' => $expiration->toDateString(),
                    'duree_validite_annees' => $duree,
                    'age_au_renouvellement' => $age,
                ])->save();

                // Donnée active du permis + colonnes historiques existantes (compatibilité).
                $p = $permisParId[$l->h_permis_id];
                $p->date_validite = $expiration->toDateString();
                foreach (['date_renou1', 'date_renou2', 'date_renou3'] as $slot) {
                    if (empty($p->{$slot})) {
                        $p->{$slot} = $delivrance->toDateString();
                        break;
                    }
                }
                $p->save();
            }

            $r->forceFill([
                'statut' => Renouvellement::STATUT_CONFIRME,
                'reference_paiement' => $referencePaiement,
                'date_confirmation_paiement' => $confirmation,
                'nouvelle_date_delivrance' => $delivrance->toDateString(),
            ])->save();

            Log::info('[Renouvellement] Renouvellement confirmé', [
                'id' => $r->id,
                'numero_identite' => $r->numero_identite,
                'reference_paiement' => $referencePaiement,
                'nouvelle_delivrance' => $delivrance->toDateString(),
                'categories' => $lignes->map(fn ($l) => [
                    'categorie' => $l->categorie,
                    'ancienne_expiration' => $l->ancienne_date_expiration->toDateString(),
                    'nouvelle_expiration' => $l->nouvelle_date_expiration->toDateString(),
                ])->all(),
                'agent_id' => $r->agent_id,
            ]);

            return $r->load('categories');
        });
    }

    /**
     * Paiement échoué/annulé : aucune nouvelle date n'est générée.
     */
    public function echouer(string $renouvellementId, string $motif): void
    {
        DB::transaction(function () use ($renouvellementId, $motif) {
            $r = Renouvellement::whereKey($renouvellementId)->lockForUpdate()->first();
            if (! $r || $r->statut !== Renouvellement::STATUT_EN_ATTENTE) {
                return;
            }
            $this->changerStatut($r, Renouvellement::STATUT_ECHOUE, ['motif_echec' => mb_substr($motif, 0, 255)]);
        });

        Log::warning('[Renouvellement] Paiement échoué', ['id' => $renouvellementId, 'motif' => $motif]);
    }

    private function changerStatut(Renouvellement $r, string $statut, array $champs = []): void
    {
        $r->forceFill(['statut' => $statut] + $champs)->save();
        RenouvellementCategorie::where('renouvellement_id', $r->id)->update(['statut' => $statut, 'updated_at' => now()]);
    }

    /**
     * Vérifie auprès de Paynala (Airtel) un renouvellement en attente.
     */
    public function verifierPaiementAirtel(Renouvellement $r): Renouvellement
    {
        if ($r->statut !== Renouvellement::STATUT_EN_ATTENTE || $r->operateur !== Renouvellement::OPERATEUR_AIRTEL) {
            return $r->load('categories');
        }
        // Payé par une commande du guichet : seul le code de la commande fait foi.
        if (DB::table('commande_guichet_lignes')->where('type', 'RENOUVELLEMENT')->where('objet_id', $r->id)->exists()) {
            return $r->load('categories');
        }

        $result = (config('services.paynala.simulation') && app()->environment('local'))
            ? ['success' => true, 'count' => 1, 'data' => ['payments' => [['status' => 'SUCCESS', 'airtel_money_id' => 'SIMULATION-' . $r->id]]]]
            : $this->airtelService->lookupPayment($r->code_paiement);

        $paiement = $result['data']['payments'][0] ?? null;
        if (($result['success'] ?? false) && (int) ($result['count'] ?? 0) > 0 && ($paiement['status'] ?? null) === 'SUCCESS') {
            return $this->confirmerPaiement($r->id, $paiement['airtel_money_id'] ?? null) ?? $r;
        }

        return $r->load('categories');
    }

    public function verifierPaiementsAirtelEnAttente(): void
    {
        Renouvellement::where('statut', Renouvellement::STATUT_EN_ATTENTE)
            ->where('operateur', Renouvellement::OPERATEUR_AIRTEL)
            // Payés par une commande du guichet : vérifiés avec le code de la commande (CommandeGuichetService).
            ->whereNotExists(fn ($q) => $q->from('commande_guichet_lignes')
                ->whereColumn('commande_guichet_lignes.objet_id', 'renouvellements.id')
                ->where('commande_guichet_lignes.type', 'RENOUVELLEMENT'))
            ->orderBy('created_at')
            ->each(function (Renouvellement $r) {
                try {
                    $this->verifierPaiementAirtel($r);
                } catch (\Throwable $e) {
                    Log::error('[Renouvellement] Vérification Airtel en échec', ['id' => $r->id, 'error' => $e->getMessage()]);
                }
            });
    }
}
