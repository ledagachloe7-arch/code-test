<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\RenouvellementException;
use App\Http\Controllers\Controller;
use App\Models\Renouvellement;
use App\Services\RenouvellementService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

#[Group('Renouvellement', description: 'Renouvellement de permis par titulaire (toutes ses catégories) : contrôle d\'expiration côté serveur, paiement confirmé obligatoire, dates calculées par le serveur.')]
class RenouvellementController extends Controller
{
    public function __construct(protected RenouvellementService $service)
    {
    }

    #[Endpoint(title: 'État de renouvellement d\'un titulaire', description: 'Paramètre : id d\'une ligne h_permis du titulaire. Retourne le titulaire, toutes ses catégories (expiration, date d\'ouverture, renouvelable), le message, le montant et l\'historique.')]
    public function etat(string $hPermisId): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $this->service->etat($hPermisId),
                'historique' => $this->service->historique($hPermisId),
            ]);
        } catch (RenouvellementException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status());
        }
    }

    #[Endpoint(title: 'Initier un renouvellement', description: 'Body : operateur (MOOV|AIRTEL), telephone (obligatoire pour MOOV). Un seul paiement pour toutes les catégories expirées du titulaire. 422 si aucune catégorie n\'est expirée depuis au moins un jour ; 409 si un paiement est déjà en attente. Aucune date n\'est générée avant confirmation du paiement.')]
    public function initier(Request $request, string $hPermisId): JsonResponse
    {
        $validated = $request->validate([
            'operateur' => 'required|string|in:MOOV,AIRTEL,moov,airtel',
            'telephone' => 'nullable|string|max:30',
        ]);

        try {
            $result = $this->service->initier(
                $hPermisId,
                $validated['operateur'],
                $validated['telephone'] ?? null,
                $request->attributes->get('authenticated_user')
            );
        } catch (RenouvellementException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status());
        }

        $r = $result['renouvellement'];
        $echec = $r->statut === Renouvellement::STATUT_ECHOUE;
        return response()->json([
            'success' => ! $echec,
            'message' => $echec ? ($result['paiement']['message'] ?? 'Échec du paiement.') : RenouvellementService::MSG_EN_ATTENTE,
            'data' => $r,
            'paiement' => $result['paiement'],
        ], $echec ? 422 : 201);
    }

    #[Endpoint(title: 'Statut d\'un renouvellement', description: 'Pour un renouvellement Airtel en attente, interroge Paynala avant de répondre.')]
    public function show(string $id): JsonResponse
    {
        $r = Renouvellement::find($id);
        if (! $r) {
            return response()->json(['success' => false, 'message' => 'Renouvellement introuvable.'], 404);
        }

        try {
            $r = $this->service->verifierPaiementAirtel($r);
        } catch (RenouvellementException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status());
        }

        $message = match ($r->statut) {
            Renouvellement::STATUT_CONFIRME => 'Renouvellement confirmé : '
                . $r->categories->map(fn ($c) => $c->categorie . ' jusqu\'au ' . $c->nouvelle_date_expiration->format('d/m/Y'))->implode(', ')
                . '.',
            Renouvellement::STATUT_EN_ATTENTE => RenouvellementService::MSG_EN_ATTENTE,
            default => 'Paiement échoué ou annulé : aucune nouvelle date générée.'
                . ($r->motif_echec ? ' (' . $r->motif_echec . ')' : ''),
        };

        return response()->json(['success' => true, 'message' => $message, 'data' => $r]);
    }
}
