<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\RenouvellementException;
use App\Http\Controllers\Controller;
use App\Models\CommandeGuichet;
use App\Models\CommandeGuichetLigne;
use App\Services\CommandeGuichetService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

#[Group('Guichet usager', description: 'Paiement groupé : plusieurs actions d\'un même usager (renouvellement, digitalisation, mise à jour) payées avec un seul code.')]
class CommandeGuichetController extends Controller
{
    public function __construct(protected CommandeGuichetService $service)
    {
    }

    private function reglesLignes(): array
    {
        return [
            'h_permis_id' => 'required|uuid',
            'lignes' => 'required|array|min:1|max:10',
            'lignes.*.type' => 'required|string|in:' . implode(',', CommandeGuichetLigne::TYPES),
            'lignes.*.objet_id' => 'nullable|uuid',
        ];
    }

    private function erreur(RenouvellementException $e): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status());
    }

    #[Endpoint(title: 'Devis du paiement groupé', description: 'Body : h_permis_id (une ligne de l\'usager), lignes[] {type: RENOUVELLEMENT|DIGITALISATION|MISE_A_JOUR, objet_id: id du dossier ou de la demande}. Retourne le détail et le total calculés par le serveur. N\'enregistre rien.')]
    public function devis(Request $request): JsonResponse
    {
        $v = $request->validate($this->reglesLignes());
        try {
            $devis = $this->service->devis($v['h_permis_id'], $v['lignes']);
        } catch (RenouvellementException $e) {
            return $this->erreur($e);
        }
        unset($devis['titulaire']);

        return response()->json(['success' => true, 'data' => $devis]);
    }

    #[Endpoint(title: 'Payer tout (créer la commande)', description: 'Mêmes champs que le devis + operateur (MOOV|AIRTEL), telephone (obligatoire pour MOOV). Crée la commande, le renouvellement en attente, et déclenche un seul paiement.')]
    public function store(Request $request): JsonResponse
    {
        $v = $request->validate($this->reglesLignes() + [
            'operateur' => 'required|string|in:MOOV,AIRTEL,moov,airtel',
            'telephone' => 'nullable|string|max:30',
        ]);

        try {
            $result = $this->service->creer(
                $v['h_permis_id'],
                $v['lignes'],
                $v['operateur'],
                $v['telephone'] ?? null,
                $request->attributes->get('authenticated_user')
            );
        } catch (RenouvellementException $e) {
            return $this->erreur($e);
        }

        $c = $result['commande'];
        $echec = $c->statut === CommandeGuichet::STATUT_ECHOUE;

        return response()->json([
            'success' => ! $echec,
            'message' => $echec ? ($result['paiement']['message'] ?? 'Échec du paiement.') : $result['paiement']['message'],
            'data' => CommandeGuichetService::presenter($c),
            'paiement' => $result['paiement'],
        ], $echec ? 422 : 201);
    }

    #[Endpoint(title: 'Statut d\'une commande', description: 'Pour une commande Airtel en attente, interroge Paynala avant de répondre (confirmation de toutes les actions si payé).')]
    public function show(string $id): JsonResponse
    {
        $c = CommandeGuichet::find($id);
        if (! $c) {
            return response()->json(['success' => false, 'message' => 'Commande introuvable.'], 404);
        }

        try {
            $c = $this->service->verifierPaiementAirtel($c);
        } catch (RenouvellementException $e) {
            return $this->erreur($e);
        }

        $message = match ($c->statut) {
            CommandeGuichet::STATUT_CONFIRME => 'Paiement confirmé : toutes les actions sont validées.',
            CommandeGuichet::STATUT_ECHOUE => 'Paiement échoué : ' . ($c->motif_echec ?? ''),
            default => CommandeGuichetService::MSG_EN_ATTENTE,
        };

        return response()->json(['success' => true, 'message' => $message, 'data' => CommandeGuichetService::presenter($c)]);
    }
}
