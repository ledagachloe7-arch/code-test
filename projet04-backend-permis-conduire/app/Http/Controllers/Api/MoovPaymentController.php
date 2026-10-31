<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dossier;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use App\Services\PaiementMoovService;
use App\Services\PaiementHistoriqueService;
use App\Http\Helpers\CentreScopeHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Paiement Moov Money (Gabon) — flux historique : initiation SOAP InitTrans, callback Result URL.
 * La vérification REST Rengus (JWT + check-order) est dans {@see MoovRengusVerificationController}.
 */
#[Group(
    'Paiements Moov (SOAP)',
    description: 'Flux Huawei / Moov Money : InitTrans_OnlineMerchantPayment (push sur le téléphone) et callback Result URL (sans auth). La vérification d’une commande via l’API REST Rengus (JWT + check-order) est documentée sous le groupe « Moov Rengus — vérification » et dans README_MOOV_RENGUS_VERIFICATION.md.'
)]
class MoovPaymentController extends Controller
{
    public function __construct(
        protected PaiementMoovService $moovService,
        protected PaiementHistoriqueService $paiementHistoriqueService
    ) {
    }

    /**
     * Initie un paiement Moov : envoie la requête SOAP InitTrans_OnlineMerchantPayment
     * pour déclencher le push de débit sur le téléphone du client.
     *
     * Montant : pris de la formation du dossier, ou envoyé en body (montant, currency).
     */
    #[Endpoint(
        title: 'Initier paiement Moov (SOAP)',
        description: 'POST protégé par auth.token. Paramètre route : UUID du dossier. Body : `numero`, `telephone` ou `contact` (obligatoire) ; optionnel `montant`, `currency` (défaut XAF). Le dossier doit être EN_ATTENTE_PAIEMENT. Envoie InitTrans_OnlineMerchantPayment vers la plateforme Moov (variables MOOV_* SOAP). Distinct de la vérif Rengus REST.'
    )]
    #[ScrambleResponse(200, 'success true + conversation_id, originator_conversation_id, response_code, response_desc si présents.')]
    #[ScrambleResponse(403, 'Agent : dossier hors centre.')]
    #[ScrambleResponse(404, 'Dossier introuvable.')]
    #[ScrambleResponse(422, 'Dossier pas en attente de paiement ; numéro manquant ; ou échec SOAP (success false).')]
    public function initierPaiement(Request $request, string $dossierId): JsonResponse
    {
        $dossier = Dossier::with(['candidat.personne', 'formation'])->find($dossierId);
        if (!$dossier) {
            return response()->json([
                'success' => false,
                'message' => 'Dossier non trouvé.',
            ], 404);
        }

        $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
        if ($forbidden) {
            return $forbidden;
        }

        if ($dossier->statut !== 'EN_ATTENTE_PAIEMENT') {
            return response()->json([
                'success' => false,
                'message' => 'Le dossier n\'est pas en attente de paiement (statut attendu: EN_ATTENTE_PAIEMENT).',
            ], 422);
        }

        $numero = $request->input('numero') ?? $request->input('telephone') ?? $request->input('contact');
        if (empty($numero) || !is_string($numero)) {
            return response()->json([
                'success' => false,
                'message' => 'Le numéro de téléphone est obligatoire (champ : numero, telephone ou contact).',
            ], 422);
        }

        $montant = $request->has('montant') ? (float) $request->input('montant') : null;
        $currency = $request->input('currency', 'XAF');

        $result = $this->moovService->initierPaiement($dossier, $numero, $montant, $currency);

        $status = $result['success'] ? 200 : 422;
        $payload = [
            'success' => $result['success'],
            'message' => $result['message'],
        ];
        if (!empty($result['conversation_id'])) {
            $payload['conversation_id'] = $result['conversation_id'];
        }
        if (!empty($result['originator_conversation_id'])) {
            $payload['originator_conversation_id'] = $result['originator_conversation_id'];
        }
        if (!empty($result['response_code'])) {
            $payload['response_code'] = $result['response_code'];
        }
        if (!empty($result['response_desc'])) {
            $payload['response_desc'] = $result['response_desc'];
        }

        return response()->json($payload, $status);
    }

    /**
     * Callback (Result URL) appelé par la plateforme Moov après traitement du paiement.
     * Route publique (sans auth) car Moov envoie le POST.
     */
    public function callbackResult(Request $request): JsonResponse
    {
        $body = $request->getContent();
        Log::info('[MoovPayment] Callback Result reçu', ['body_length' => strlen($body)]);

        $parsed = $this->moovService->parseResultXml($body);
        $originatorId = $parsed['originator_conversation_id'] ?? '';
        $resultCode = $parsed['result_code'] ?? '';
        $transactionId = $parsed['transaction_id'] ?? '';

        if (empty($originatorId) || !str_starts_with($originatorId, 'P_')) {
            Log::warning('[MoovPayment] Callback sans OriginatorConversationID valide');
            return response()->json(['ack' => true], 200);
        }

        $dossierId = substr($originatorId, 2);
        $dossier = Dossier::with(['candidat.personne', 'formation'])->find($dossierId);
        if (!$dossier) {
            Log::warning('[MoovPayment] Dossier non trouvé pour callback', ['dossier_id' => $dossierId]);
            return response()->json(['ack' => true], 200);
        }

        if ($resultCode === '0') {
            try {
                DB::transaction(function () use ($dossier, $transactionId) {
                    $montant = $dossier->formation ? (float) $dossier->formation->montant : 0;
                    $this->paiementHistoriqueService->creerPaiement([
                        'dossier_id' => $dossier->id,
                        'code_paiement' => $dossier->code_paiement,
                        'reference_paiement' => $transactionId ?: 'MOOV-' . $dossier->id,
                        'montant' => $montant,
                        'nom' => $dossier->candidat?->personne?->nom ?? '',
                        'prenom' => $dossier->candidat?->personne?->prenom ?? '',
                    ]);
                    $dossier->update([
                        'statut' => "PAIEMENT DE FRAIS D'EXAMEN - Complété",
                    ]);
                });
                Log::info('[MoovPayment] Paiement Moov enregistré', ['dossier_id' => $dossier->id, 'transaction_id' => $transactionId]);
            } catch (\Throwable $e) {
                Log::error('[MoovPayment] Erreur lors de l\'enregistrement du paiement', ['dossier_id' => $dossier->id, 'error' => $e->getMessage()]);
            }
        } else {
            Log::warning('[MoovPayment] Paiement Moov échoué', [
                'dossier_id' => $dossierId,
                'result_code' => $resultCode,
                'result_desc' => $parsed['result_desc'] ?? '',
                'result_type' => $parsed['result_type'] ?? '',
            ]);
        }

        return response()->json(['ack' => true], 200);
    }
}
