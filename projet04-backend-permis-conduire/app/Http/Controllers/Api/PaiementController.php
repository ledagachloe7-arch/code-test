<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Paiement\StorePaiementRequest;
use App\Http\Requests\Paiement\UpdatePaiementRequest;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Resources\PaiementResource;
use Illuminate\Http\Response;
use Barryvdh\DomPDF\Facade\Pdf;
use Dedoc\Scramble\Attributes\QueryParameter;

class PaiementController extends Controller
{

    #[QueryParameter('nom', description: 'Filtrer par nom', type: 'string', required: false)]
    #[QueryParameter('code_paiement', description: 'Filtrer par code de paiement', type: 'string', required: false)]
    #[QueryParameter('date', description: 'Filtrer par date exact', type: 'string', required: false)]
    #[QueryParameter('date_from', description: 'Filtrer par intervalle de date , date de début', required: false)]
    #[QueryParameter('date_to', description: 'Filtrer par intervalle de date, date de fin', required: false)]
    public function index(Request $request): JsonResponse
    {
        $query = Paiement::with('dossier'); // ✅ eager loading

        // 🔍 Filtre par nom
        if ($request->filled('nom')) {
            $query->where('nom', 'LIKE', '%' . $request->nom . '%');
        }

        // 🔍 Filtre par code paiement
        if ($request->filled('code_paiement')) {
            $query->where('code_paiement', 'LIKE', '%' . $request->code_paiement . '%');
        }

        // 📅 Filtre par date exacte
        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        // 📅 Intervalle de dates
        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('created_at', [
                $request->date_from . ' 00:00:00',
                $request->date_to . ' 23:59:59'
            ]);
        }

        // 🔃 Tri sécurisé
        $allowedSorts = ['created_at', 'montant', 'nom', 'code_paiement'];

        $sortBy = in_array($request->get('sort_by'), $allowedSorts)
            ? $request->get('sort_by')
            : 'created_at';

        $direction = $request->get('sort_direction', 'desc');

        $query->orderBy($sortBy, $direction);

        // 📊 Pagination
        $perPage = (int) $request->get('per_page', 10);

        $paiements = $query
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json([
            'data' => PaiementResource::collection($paiements),
            'meta' => [
                'current_page' => $paiements->currentPage(),
                'last_page' => $paiements->lastPage(),
                'per_page' => $paiements->perPage(),
                'total' => $paiements->total(),
            ]
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $paiement = Paiement::findOrFail($id);

        return response()->json($paiement);
    }

    public function store(StorePaiementRequest $request): JsonResponse
    {
        $data = $request->validated();

        $paiement = Paiement::create($data);

        return response()->json([
            'message' => 'Paiement créé avec succès',
            'data' => $paiement
        ], 201);
    }

    public function update(UpdatePaiementRequest $request, string $id): JsonResponse
    {
        $paiement = Paiement::findOrFail($id);

        $paiement->update($request->validated());

        return response()->json([
            'message' => 'Paiement mis à jour',
            'data' => $paiement
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $paiement = Paiement::findOrFail($id);

        $paiement->delete();

        return response()->json([
            'message' => 'Paiement supprimé'
        ]);
    }

    /* public function viewPdf(string $id): \Illuminate\Http\Response
    {
        $paiement = Paiement::with('dossier')->findOrFail($id);

        $pdf = Pdf::loadView('paiements.pdf', ['paiement' => $paiement])
            ->setPaper('A4', 'portrait');

        $filename = 'paiement_' . $paiement->code_paiement . '.pdf';

        // Inline pour visualisation dans le navigateur
        return $pdf->stream($filename);
    } */

    public function downloadPdf(string $id): Response
    {
        $paiement = Paiement::with('dossier')->findOrFail($id);

        $pdf = Pdf::loadView('paiements.pdf', ['paiement' => $paiement])
            ->setPaper('A4', 'portrait');

        $filename = 'paiement_' . $paiement->code_paiement . '.pdf';

        // Téléchargement du fichier
        return $pdf->download($filename);
    }


    public function viewPdf(string $id): Response
    {
        $paiement = Paiement::with('dossier')->findOrFail($id);

        $pdf = Pdf::loadView('paiements.pdf', ['paiement' => $paiement])
            // Largeur 80mm (≈226px), hauteur automatique
            ->setPaper([0, 0, 226, 350]);

        $filename = 'ticket_paiement_' . $paiement->code_paiement . '.pdf';

        // Inline pour visualisation dans le navigateur
        return $pdf->stream($filename);
    }
}
