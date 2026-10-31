<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaiementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaiementAirtelCallbackController extends Controller
{
    /**
     * Callback technique appelé par Airtel/Paynala après un paiement.
     * On ne refait pas toute la logique ici : on déclenche simplement
     * le traitement standard des dossiers en attente de paiement.
     */
    public function handle(Request $request, PaiementService $paiementService): JsonResponse
    {
        // Log de debug pour tracer le payload retourné par Airtel
        Log::info('[Airtel] Callback reçu', [
            'payload' => $request->all(),
        ]);

        // Laisse PaiementService décider quels dossiers mettre à jour
        // en fonction de code_paiement et de la réponse de lookupPayment.
        $paiementService->dossierPendingPayments();

        return response()->json([
            'success' => true,
            'message' => 'Callback Airtel traité. Dossiers en attente de paiement vérifiés.',
        ]);
    }
}

