<?php

namespace App\Services;

use App\Exceptions\RenouvellementException;
use App\Models\HPermis;
use App\Models\Renouvellement;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Règles du module Renouvellement (cahier des charges §1-3).
 *
 * - Renouvellement possible uniquement à partir du lendemain de la date d'expiration (contrôle serveur).
 * - Aucune date n'est générée tant que le paiement n'est pas confirmé.
 * - Date de délivrance = date réelle de confirmation du paiement ; expiration calculée par catégorie.
 * - Une confirmation répétée ne crée qu'un seul renouvellement (verrou + index unique partiel).
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

    /**
     * État de renouvellement d'un permis (une ligne h_permis = une catégorie).
     */
    public function etat(HPermis $permis): array
    {
        $aujourdhui = Carbon::today();
        $expiration = $permis->date_validite ? Carbon::parse($permis->date_validite)->startOfDay() : null;
        $ouverture = $expiration?->copy()->addDay();
        $enAttente = $this->renouvellementEnAttente($permis);

        $renouvelable = $expiration !== null
            && $aujourdhui->greaterThanOrEqualTo($ouverture)
            && $this->categorieSupportee($permis->categorie)
            && $enAttente === null;

        if ($expiration === null) {
            $message = "Date d'expiration inconnue : renouvellement impossible. Contactez l'administration.";
        } elseif (! $this->categorieSupportee($permis->categorie)) {
            $message = "Catégorie « {$permis->categorie} » non prise en charge pour le renouvellement.";
        } elseif ($enAttente !== null) {
            $message = self::MSG_EN_ATTENTE;
        } elseif (! $aujourdhui->greaterThanOrEqualTo($ouverture)) {
            $message = 'Votre permis est encore valide. Renouvellement possible à partir du ' . $ouverture->format('d/m/Y') . '.';
        } else {
            $message = 'Permis expiré : renouvellement possible.';
        }

        return [
            'h_permis_id' => $permis->id,
            'numero_permis' => $permis->numero_permis,
            'nom' => $permis->nom,
            'prenom' => $permis->prenom,
            'date_naissance' => $permis->date_naissance,
            'categorie' => $permis->categorie,
            'date_expiration' => $expiration?->toDateString(),
            'date_ouverture_renouvellement' => $ouverture?->toDateString(),
            'expire' => $expiration !== null && $aujourdhui->greaterThan($expiration),
            'renouvelable' => $renouvelable,
            'message' => $message,
            'renouvellement_en_attente' => $enAttente,
            'montant' => (float) config('renouvellement.montant'),
            'devise' => config('renouvellement.devise'),
        ];
    }

    public function renouvellementEnAttente(HPermis $permis): ?Renouvellement
    {
        return Renouvellement::where('h_permis_id', $permis->id)
            ->where('statut', Renouvellement::STATUT_EN_ATTENTE)
            ->first();
    }

    public function historique(HPermis $permis)
    {
        return Renouvellement::where('h_permis_id', $permis->id)
            ->orderByDesc('created_at')
            ->get();
    }

    // ------------------------------------------------------------------
    // Initiation (avant paiement)
    // ------------------------------------------------------------------

    /**
     * Enregistre la demande et déclenche le paiement. Aucune date n'est générée ici.
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

        $montant = (float) config('renouvellement.montant');
        if ($montant <= 0) {
            throw new RenouvellementException('Montant du renouvellement non configuré (RENOUVELLEMENT_MONTANT).', 500);
        }

        $renouvellement = DB::transaction(function () use ($hPermisId, $operateur, $telephone, $agent, $montant) {
            /** @var HPermis|null $permis */
            $permis = HPermis::whereKey($hPermisId)->lockForUpdate()->first();
            if (! $permis) {
                throw new RenouvellementException('Permis introuvable.', 404);
            }

            $etat = $this->etat($permis);
            if ($etat['renouvellement_en_attente'] !== null) {
                throw new RenouvellementException(self::MSG_EN_ATTENTE, 409);
            }
            if (! $etat['renouvelable']) {
                throw new RenouvellementException($etat['message'], 422);
            }

            // Vérifie dès maintenant que la durée pourra être calculée (C/D : date de naissance requise).
            $this->dureeValidite(
                $permis->categorie,
                $permis->date_naissance ? Carbon::parse($permis->date_naissance) : null,
                Carbon::today()
            );

            $r = new Renouvellement();
            $r->forceFill([
                'numero' => 'RNV-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                'h_permis_id' => $permis->id,
                'numero_permis' => $permis->numero_permis,
                'categorie' => self::normaliserCategorie($permis->categorie),
                'statut' => Renouvellement::STATUT_EN_ATTENTE,
                'operateur' => $operateur,
                'code_paiement' => 'RNV' . strtoupper(Str::random(10)),
                'montant' => $montant,
                'telephone' => $telephone,
                'ancienne_date_expiration' => $etat['date_expiration'],
                'agent_id' => $agent->id ?? null,
                'agent_email' => $agent->email ?? null,
            ])->save();

            return $r;
        });

        Log::info('[Renouvellement] Demande initiée', [
            'renouvellement_id' => $renouvellement->id,
            'h_permis_id' => $hPermisId,
            'operateur' => $operateur,
            'agent_id' => $agent->id ?? null,
        ]);

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
                $renouvellement->refresh();
            }
        } else {
            $paiement['message'] = 'Demande enregistrée. Le titulaire doit payer via Airtel Money avec le code '
                . $renouvellement->code_paiement . '.';
        }

        return ['renouvellement' => $renouvellement, 'paiement' => $paiement];
    }

    // ------------------------------------------------------------------
    // Confirmation / échec du paiement
    // ------------------------------------------------------------------

    /**
     * Finalise le renouvellement après confirmation effective du paiement.
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
                return $r;
            }
            if ($r->statut !== Renouvellement::STATUT_EN_ATTENTE) {
                Log::warning('[Renouvellement] Confirmation reçue pour un renouvellement non en attente — à traiter manuellement', [
                    'id' => $r->id, 'statut' => $r->statut, 'reference' => $referencePaiement,
                ]);
                return $r;
            }

            /** @var HPermis $permis */
            $permis = HPermis::whereKey($r->h_permis_id)->lockForUpdate()->firstOrFail();

            // L'échéance a-t-elle changé depuis l'initiation ? (sécurité : pas de double renouvellement)
            $expirationActuelle = $permis->date_validite ? Carbon::parse($permis->date_validite)->toDateString() : null;
            if ($expirationActuelle !== $r->ancienne_date_expiration->toDateString()) {
                Log::error('[Renouvellement] Échéance modifiée depuis l\'initiation — paiement confirmé à traiter manuellement', [
                    'id' => $r->id, 'attendue' => $r->ancienne_date_expiration->toDateString(), 'actuelle' => $expirationActuelle,
                ]);
                $r->forceFill([
                    'statut' => Renouvellement::STATUT_ANNULE,
                    'reference_paiement' => $referencePaiement,
                    'date_confirmation_paiement' => now(),
                    'motif_echec' => 'Échéance déjà modifiée : paiement confirmé à régulariser manuellement.',
                ])->save();
                return $r;
            }

            $confirmation = now();
            $delivrance = $confirmation->copy()->startOfDay();
            $dateNaissance = $permis->date_naissance ? Carbon::parse($permis->date_naissance) : null;
            $duree = $this->dureeValidite($r->categorie, $dateNaissance, $delivrance);
            $expiration = $delivrance->copy()->addYears($duree);

            $r->forceFill([
                'statut' => Renouvellement::STATUT_CONFIRME,
                'reference_paiement' => $referencePaiement,
                'date_confirmation_paiement' => $confirmation,
                'nouvelle_date_delivrance' => $delivrance->toDateString(),
                'nouvelle_date_expiration' => $expiration->toDateString(),
                'duree_validite_annees' => $duree,
                'age_au_renouvellement' => $dateNaissance ? (int) $dateNaissance->diffInYears($delivrance) : null,
            ])->save();

            // Donnée active du permis + colonnes historiques existantes (compatibilité).
            $permis->date_validite = $expiration->toDateString();
            foreach (['date_renou1', 'date_renou2', 'date_renou3'] as $slot) {
                if (empty($permis->{$slot})) {
                    $permis->{$slot} = $delivrance->toDateString();
                    break;
                }
            }
            $permis->save();

            Log::info('[Renouvellement] Renouvellement confirmé', [
                'id' => $r->id,
                'h_permis_id' => $permis->id,
                'categorie' => $r->categorie,
                'reference_paiement' => $referencePaiement,
                'ancienne_expiration' => $r->ancienne_date_expiration->toDateString(),
                'nouvelle_delivrance' => $delivrance->toDateString(),
                'nouvelle_expiration' => $expiration->toDateString(),
                'agent_id' => $r->agent_id,
            ]);

            return $r;
        });
    }

    /**
     * Paiement échoué/annulé : aucune nouvelle date n'est générée.
     */
    public function echouer(string $renouvellementId, string $motif): void
    {
        $n = Renouvellement::whereKey($renouvellementId)
            ->where('statut', Renouvellement::STATUT_EN_ATTENTE)
            ->update(['statut' => Renouvellement::STATUT_ECHOUE, 'motif_echec' => mb_substr($motif, 0, 255), 'updated_at' => now()]);

        Log::warning('[Renouvellement] Paiement échoué', ['id' => $renouvellementId, 'motif' => $motif, 'mis_a_jour' => $n]);
    }

    /**
     * Vérifie auprès de Paynala (Airtel) un renouvellement en attente.
     */
    public function verifierPaiementAirtel(Renouvellement $r): Renouvellement
    {
        if ($r->statut !== Renouvellement::STATUT_EN_ATTENTE || $r->operateur !== Renouvellement::OPERATEUR_AIRTEL) {
            return $r;
        }

        $result = (config('services.paynala.simulation') && app()->environment('local'))
            ? ['success' => true, 'count' => 1, 'data' => ['payments' => [['status' => 'SUCCESS', 'airtel_money_id' => 'SIMULATION-' . $r->id]]]]
            : $this->airtelService->lookupPayment($r->code_paiement);

        $paiement = $result['data']['payments'][0] ?? null;
        if (($result['success'] ?? false) && (int) ($result['count'] ?? 0) > 0 && ($paiement['status'] ?? null) === 'SUCCESS') {
            return $this->confirmerPaiement($r->id, $paiement['airtel_money_id'] ?? null) ?? $r;
        }

        return $r;
    }

    public function verifierPaiementsAirtelEnAttente(): void
    {
        Renouvellement::where('statut', Renouvellement::STATUT_EN_ATTENTE)
            ->where('operateur', Renouvellement::OPERATEUR_AIRTEL)
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
