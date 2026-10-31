<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dossier;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

#[Group(
    'Paiements publics',
    description: 'Endpoints **sans** middleware `auth.token` (pas de Bearer JWT sur ces routes). Chaque opération exige le header **`X-API-KEY`** égal à `PUBLIC_API_KEY` (`.env` → `config/services.php` → `services.public_api.key`). Inclut la vérification d’existence d’un code (`GET …/exists`). Documentation : `README_API_PUBLIC_VERIFICATION_CODE_PAIEMENT.md`.'
)]
class PublicPaiementController extends Controller
{
    /**
     * Endpoint public protégé par X-API-KEY.
     * Vérifie si un code_paiement existe sur un dossier (dossiers.code_paiement).
     */
    #[Endpoint(
        title: 'Vérifier l’existence d’un code de paiement',
        description: '`GET /api/public/paiements/exists` — indique si un `code_paiement` est présent sur un **dossier** (`dossiers.code_paiement`).

**Header obligatoire** : `X-API-KEY: <PUBLIC_API_KEY>` (même valeur que dans `.env`). Pas de header `Authorization` requis pour cet endpoint.

**Codes HTTP (résumé)** :
- **200** — clé valide **et** query `code_paiement` non vide après trim. Le corps distingue le cas « trouvé / non trouvé » via **`exists`** (voir réponses 200 ci-dessous) : **code inconnu = toujours HTTP 200**, pas de 404.
- **401** — clé absente, incorrecte, ou `PUBLIC_API_KEY` non défini côté serveur.
- **422** — `code_paiement` absent ou vide.

**Règle métier** : égalité **stricte** sur `code_paiement` (casse et caractères). Ce n’est **pas** un appel Paynala / Airtel : uniquement une lecture en base `dossiers`.'
    )]
    #[QueryParameter('code_paiement', description: 'Code à comparer à `dossiers.code_paiement` (souvent généré quand le dossier passe en `EN_ATTENTE_PAIEMENT`). Obligatoire, non vide après trim.', type: 'string', required: true)]
    #[ScrambleResponse(200, 'Clé OK + code fourni : **code trouvé** — `{ "success": true, "exists": true, "data": { "dossier_id": "uuid", "statut": "..." } }`.')]
    #[ScrambleResponse(200, 'Clé OK + code fourni : **code introuvable** — `{ "success": true, "exists": false, "data": null }` (même code HTTP **200** ; se fier à `exists`).')]
    #[ScrambleResponse(401, '`X-API-KEY` manquant ou invalide (ou clé serveur non configurée). Corps : `{ "success": false, "message": "Clé API invalide." }`.')]
    #[ScrambleResponse(422, '`code_paiement` manquant ou vide. Corps : `{ "success": false, "message": "...", "exists": false }`.')]
    public function exists(Request $request): JsonResponse
    {
        $code = (string) $request->query('code_paiement', '');
        $code = trim($code);

        if ($code === '') {
            return response()->json([
                'success' => false,
                'message' => 'Le paramètre code_paiement est obligatoire.',
                'exists' => false,
            ], 422);
        }

        $dossier = Dossier::query()
            ->select(['id', 'code_paiement', 'statut'])
            ->where('code_paiement', $code)
            ->first();

        if ($dossier !== null) {
            return response()->json([
                'success' => true,
                'exists' => true,
                'data' => [
                    'dossier_id' => $dossier->id,
                    'statut' => $dossier->statut,
                ],
            ], 200);
        }

        return response()->json([
            'success' => true,
            'exists' => false,
            'data' => null,
        ], 200);
    }
}
