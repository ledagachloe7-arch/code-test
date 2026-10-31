<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AirtelSmsService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

#[Group('SMS', description: 'Endpoint public pour envoyer un SMS via Airtel.')]
class PublicSmsController extends Controller
{
    #[Endpoint(
        title: 'Envoyer un SMS (public)',
        description: 'Envoie un SMS via Airtel. Endpoint public (sans authentification). Body JSON : `numero` (string) et `message` (string). Le service Airtel applique une limite 160 caractères.'
    )]
    #[ScrambleResponse(200, 'SMS envoyé (success=true).')]
    #[ScrambleResponse(422, 'Validation échouée ou échec envoi SMS (success=false).')]
    public function send(Request $request, AirtelSmsService $smsService): JsonResponse
    {
        $data = $request->validate([
            'numero' => ['required', 'string', 'min:6', 'max:32'],
            'message' => ['required', 'string', 'min:1', 'max:1000'],
        ]);

        $numero = $data['numero'];
        $message = $data['message'];

        $sent = $smsService->send($numero, $message);

        if (!$sent) {
            Log::warning('[SMS] Envoi public échoué', ['numero' => $numero]);
            return response()->json([
                'success' => false,
                'message' => 'Échec de l’envoi du SMS.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'SMS envoyé.',
        ], 200);
    }
}

