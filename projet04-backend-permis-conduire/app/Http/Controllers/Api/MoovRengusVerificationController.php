<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Helpers\CentreScopeHelper;
use App\Http\Requests\Moov\VerifierCommandeRengusRequest;
use App\Models\Dossier;
use App\Models\Utilisateur;
use App\Services\MoovRengusApiService;
use App\Services\PaiementHistoriqueService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * API REST Rengus (JWT + /check-order) + alignement métier permis-conduire si la réponse Moov
 * confirme le paiement puis qu’au moins une ligne transaction a REFERENCE_KEY strictement égal au code_paiement envoyé.
 */
#[Group(
    'Moov Rengus — vérification',
    description: 'API REST Rengus : JWT (/get-token) puis /check-order par OrderID. Le champ `paid` est calculé côté backend (HTTP 200 + success + count > 0). Exige une ligne `transactions` avec REFERENCE_KEY strictement égal au `code_paiement` du dossier. Synchronise `paiements` et le statut dossier si EN_ATTENTE_PAIEMENT. Distinct du flux SOAP Moov (voir groupe « Paiements Moov (SOAP) »). Configuration : variables MOOV_RENGUS_* dans .env. Documentation détaillée : README_MOOV_RENGUS_VERIFICATION.md.'
)]
class MoovRengusVerificationController extends Controller
{
    public function __construct(
        protected MoovRengusApiService $moovRengusApiService,
        protected PaiementHistoriqueService $paiementHistoriqueService
    ) {
    }

    /**
     * Après réponse Moov « commande payée » : vérifier qu’une ligne a REFERENCE_KEY === code_paiement (stricte), puis mises à jour.
     */
    #[Endpoint(
        title: 'Vérifier commande Moov (Rengus check-order) et synchroniser le dossier',
        description: 'Route protégée par auth.token. Body JSON obligatoire : `order_id` (OrderID Moov pour Rengus ; alias `OrderID` ou `reference_paiement` si `order_id` absent) et `code_paiement` (égal à dossiers.code_paiement, sert à charger le dossier). Le backend appelle Rengus avec le JWT serveur (MOOV_RENGUS_USERNAME/PASSWORD). Interprétation payé : statut HTTP 200, champ success truthy et count > 0 ; le booléen `paid` renvoyé au client est dérivé (Moov ne renvoie pas forcément un champ paid). Après constat payé : au moins une transaction doit avoir REFERENCE_KEY === code_paiement (comparaison stricte ===). Si en plus le dossier est EN_ATTENTE_PAIEMENT : creerPaiement (idempotent) et statut PAIEMENT DE FRAIS D\'EXAMEN - Complété.'
    )]
    #[ScrambleResponse(200, 'Corps JSON : fusion de la réponse Rengus/Moov (success, count, message, transactions, order_id, verified_by, …) avec moov_http_status, paid, success (même valeur que paid), code_paiement_verifie_moov, dossier_id, dossier_synchronise.')]
    #[ScrambleResponse(401, 'Non authentifié (auth.token).')]
    #[ScrambleResponse(403, 'Agent : dossier hors centre. Candidat : dossier d’un tiers.')]
    #[ScrambleResponse(422, 'Validation des champs ; ou aucun dossier pour ce code_paiement ; ou requête refusée par Rengus (HTTP 400 côté Moov, ex. OrderID manquant).')]
    #[ScrambleResponse(502, 'Rengus a répondu 401 ou 422 sur check-order : JWT Rengus manquant ou invalide ; le cache du token applicatif est vidé.')]
    #[ScrambleResponse(503, 'Erreur réseau / exception HTTP ou impossible d’obtenir le JWT (MOOV_RENGUS_API_BASE_URL, USERNAME, PASSWORD).')]
    public function checkOrder(VerifierCommandeRengusRequest $request): JsonResponse
    {
        $orderId = $request->validated('order_id');
        $codePaiement = $request->validated('code_paiement');

        $dossier = Dossier::with(['candidat.personne', 'formation'])
            ->where('code_paiement', $codePaiement)
            ->first();

        if (! $dossier) {
            return response()->json([
                'success' => false,
                'paid' => false,
                'message' => 'Aucun dossier ne correspond à ce code de paiement.',
            ], 422);
        }

        $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
        if ($forbidden) {
            return $forbidden;
        }

        if (! $this->utilisateurPeutSynchroniserDossierRengus($dossier)) {
            return response()->json([
                'success' => false,
                'paid' => false,
                'message' => 'Vous n\'êtes pas autorisé à vérifier le paiement pour ce dossier.',
            ], 403);
        }

        $r = $this->moovRengusApiService->checkOrder($orderId);

        if (! $r['transport_ok']) {
            return response()->json([
                'success' => false,
                'paid' => false,
                'message' => $r['error'] ?? 'Erreur technique.',
            ], 503);
        }

        $status = $r['status'];
        $j = $r['moov_json'] ?? [];

        if ($status === 401) {
            $this->moovRengusApiService->clearTokenCache();

            return response()->json([
                'success' => false,
                'paid' => false,
                'message' => $j['msg'] ?? 'Authentification Rengus refusée (token manquant).',
                'moov_http_status' => $status,
            ], 502);
        }

        if ($status === 422) {
            $this->moovRengusApiService->clearTokenCache();

            return response()->json([
                'success' => false,
                'paid' => false,
                'message' => $j['msg'] ?? 'Token Rengus invalide ou expiré.',
                'moov_http_status' => $status,
            ], 502);
        }

        if ($status === 400) {
            return response()->json([
                'success' => false,
                'paid' => false,
                'message' => $j['message'] ?? 'Requête invalide (OrderID requis côté Rengus).',
                'moov_http_status' => $status,
            ], 422);
        }

        $paid = $status === 200
            && ! empty($j['success'])
            && (int) ($j['count'] ?? 0) > 0;

        $message = is_array($j) && array_key_exists('message', $j)
            ? (string) $j['message']
            : ($j['msg'] ?? ($paid ? 'Transaction réussie (Completed).' : 'Aucune transaction réussie pour cet OrderID.'));

        $transactions = is_array($j['transactions'] ?? null) ? $j['transactions'] : [];

        $codeMoovVerifie = $paid && $this->transactionsMoovReferenceKeyEgaleCodePaiement($transactions, $codePaiement);

        $dossierSynchronise = false;
        if ($paid && $dossier->statut === 'EN_ATTENTE_PAIEMENT' && $codeMoovVerifie) {
            try {
                DB::transaction(function () use ($dossier, $transactions, $orderId) {
                    $refPaiement = $this->referencePaiementDepuisTransactions($transactions, $orderId);
                    $montant = $dossier->formation ? (float) $dossier->formation->montant : 0;
                    $this->paiementHistoriqueService->creerPaiement([
                        'dossier_id' => $dossier->id,
                        'code_paiement' => $dossier->code_paiement,
                        'reference_paiement' => $refPaiement,
                        'montant' => $montant,
                        'nom' => $dossier->candidat?->personne?->nom ?? '',
                        'prenom' => $dossier->candidat?->personne?->prenom ?? '',
                    ]);
                    $dossier->update([
                        'statut' => "PAIEMENT DE FRAIS D'EXAMEN - Complété",
                    ]);
                });
                $dossierSynchronise = true;
                Log::info('[MoovRengus] Dossier mis à jour après check-order', [
                    'dossier_id' => $dossier->id,
                    'order_id' => $orderId,
                ]);
            } catch (\Throwable $e) {
                Log::error('[MoovRengus] Erreur synchro dossier après check-order', [
                    'dossier_id' => $dossier->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $payload = array_merge(
            is_array($j) ? $j : [],
            [
                'moov_http_status' => $status,
                'order_id' => $j['order_id'] ?? $orderId,
                'paid' => $paid,
                'success' => $paid,
                'message' => $message,
                'count' => (int) ($j['count'] ?? 0),
                'transactions' => $transactions,
                'code_paiement_verifie_moov' => $codeMoovVerifie,
                'dossier_id' => $dossier->id,
                'dossier_synchronise' => $dossierSynchronise,
            ]
        );

        return response()->json($payload, 200);
    }

    private function utilisateurPeutSynchroniserDossierRengus(Dossier $dossier): bool
    {
        $user = Auth::user();
        if (! $user instanceof Utilisateur) {
            return false;
        }

        if ($user->isAgentWithCentre()) {
            return true;
        }

        $role = (string) ($user->role ?? '');
        if ($role === 'ROLE_CANDIDAT' || strcasecmp($role, 'candidat') === 0) {
            $user->loadMissing('personne.candidat');
            $candidatId = $user->personne?->candidat?->id;

            return $candidatId !== null && $dossier->candidat_id === $candidatId;
        }

        return true;
    }

    /**
     * Après constat que l’order est payé : au moins une ligne avec REFERENCE_KEY === code_paiement (égalité stricte des chaînes).
     *
     * @param  array<int, mixed>  $transactions
     */
    private function transactionsMoovReferenceKeyEgaleCodePaiement(array $transactions, string $codePaiement): bool
    {
        if ($codePaiement === '') {
            return false;
        }

        foreach ($transactions as $row) {
            if (! is_array($row)) {
                continue;
            }
            $key = isset($row['REFERENCE_KEY']) ? (string) $row['REFERENCE_KEY'] : '';

            if ($key === $codePaiement) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, mixed>  $transactions
     */
    private function referencePaiementDepuisTransactions(array $transactions, string $fallbackOrderId): string
    {
        foreach ($transactions as $row) {
            if (! is_array($row)) {
                continue;
            }
            $oid = $row['ORDERID'] ?? $row['order_id'] ?? null;
            if (is_string($oid) && $oid !== '') {
                return $oid;
            }
        }

        return $fallbackOrderId;
    }
}
