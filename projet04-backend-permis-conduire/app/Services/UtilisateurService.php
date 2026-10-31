<?php

namespace App\Services;
use App\Models\Utilisateur;
use Log;
use Illuminate\Http\Request;
use App\Http\Resources\UtilisateurResource;
use Illuminate\Http\JsonResponse;
class UtilisateurService
{

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);
        try {
            $utilisateurs = Utilisateur::query()
                ->when(
                    $request->role,
                    fn($query) => $query->where('role', $request->role)
                )
                ->when(
                    $request->email,
                    fn($query) => $query->where('email', $request->email)
                )
                ->when(
                    $request->telephone,
                    fn($query) => $query->where('telephone', $request->telephone)
                )->latest()
                ->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'récupération des utilisateurs avec succès.',
                'data' => UtilisateurResource::collection($utilisateurs),
                'meta' => [
                    'current_page' => $utilisateurs->currentPage(),
                    'per_page' => $utilisateurs->perPage(),
                    'total' => $utilisateurs->total(),
                    'last_page' => $utilisateurs->lastPage(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des utilisateurs : ' . $e->getMessage());
            throw new \Exception('Erreur lors de la récupération des utilisateurs.' . $e->getMessage());
        }
    }
}