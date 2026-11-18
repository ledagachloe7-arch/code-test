<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DuplicataException;
use App\Http\Controllers\Controller;
use App\Models\HPermis;
use App\Services\DuplicataRoseService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

#[Group('Duplicata permis rose', description: 'Contrôle du shortcode du titulaire et création d\'un dossier DUPLICATA lié au permis source (jamais modifié).')]
class DuplicataRoseController extends Controller
{
    public function __construct(protected DuplicataRoseService $service)
    {
    }

    #[Endpoint(title: 'Contrôle du shortcode du titulaire', description: 'Paramètre : id h_permis du permis source. statut : ACTIF | ABSENT | A_REGULARISER | NON_VERIFIE. Le contrôle porte sur la personne titulaire (pièce d\'identité, numéros de permis).')]
    public function shortcode(Request $request, string $hPermisId): JsonResponse
    {
        $permis = HPermis::find($hPermisId);
        if (! $permis) {
            return response()->json(['success' => false, 'message' => 'Permis source introuvable.'], 404);
        }
        if (! DuplicataRoseService::estPermisRose($permis)) {
            return response()->json(['success' => false, 'message' => "Fiche d'enregistrement (permis vert) : non éligible au duplicata rose."], 422);
        }

        $controle = $this->service->controleShortcode($permis);
        Log::info('[Duplicata] Contrôle shortcode', [
            'h_permis_id' => $permis->id,
            'statut' => $controle['statut'],
            'agent_id' => $request->attributes->get('authenticated_user')?->id,
        ]);

        return response()->json([
            'success' => true,
            'statut' => $controle['statut'],
            'message' => $controle['message'],
            // Le shortcode lui-même n'est renvoyé qu'une fois confirmé actif.
            'shortcode' => $controle['statut'] === DuplicataRoseService::SHORTCODE_ACTIF ? $controle['shortcode']?->shortcode : null,
        ], $controle['statut'] === DuplicataRoseService::SHORTCODE_NON_VERIFIE ? 503 : 200);
    }

    #[Endpoint(title: 'Créer une demande de duplicata (permis rose)', description: 'multipart/form-data : h_permis_ids[] (une ou plusieurs catégories du même titulaire ; le premier = permis principal), motif (PERTE|VOL|DETERIORATION|AUTRE), motif_precision (obligatoire si AUTRE), observations, justificatif (pdf/jpg/png). Contrôles serveur : permis rose existant, shortcode actif recalculé, anti-doublon. Crée un dossier DUPLICATA (statut initial en_attente) lié au permis source.')]
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Une ou plusieurs catégories d'un même titulaire ; h_permis_id (ancien format) reste accepté.
            'h_permis_ids' => 'required_without:h_permis_id|array|min:1|max:20',
            'h_permis_ids.*' => 'uuid|distinct',
            'h_permis_id' => 'required_without:h_permis_ids|uuid',
            'motif' => 'required|string|in:' . implode(',', array_keys(config('duplicata.motifs'))),
            'motif_precision' => 'nullable|string|max:255',
            'observations' => 'nullable|string|max:' . config('duplicata.observations_max'),
            'justificatif' => 'nullable|file|max:' . config('duplicata.justificatif_max_ko')
                . '|mimes:' . implode(',', config('duplicata.justificatif_types')),
        ]);

        try {
            $ids = $data['h_permis_ids'] ?? [$data['h_permis_id']];
            $d = $this->service->creer($ids, $data, $request->file('justificatif'), $request->attributes->get('authenticated_user'));
        } catch (DuplicataException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status());
        }

        return response()->json([
            'success' => true,
            'message' => "Demande de duplicata créée : dossier {$d->dossier->numero}.",
            'data' => [
                'duplicata_id' => $d->id,
                'dossier_id' => $d->dossier_id,
                'numero_dossier' => $d->dossier->numero,
                'statut_dossier' => $d->dossier->statut,
                'numero_permis_source' => $d->numero_permis_source,
                'categories' => \Illuminate\Support\Facades\DB::table('duplicata_demande_permis')
                    ->where('duplicata_demande_id', $d->id)->orderBy('categorie')->pluck('categorie'),
            ],
        ], 201);
    }
}
