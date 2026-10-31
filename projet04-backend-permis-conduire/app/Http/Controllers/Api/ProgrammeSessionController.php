<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProgrammeSession\StoreProgrammeSessionRequest;
use Dedoc\Scramble\Attributes\Group;
use App\Http\Requests\ProgrammeSession\UpdateProgrammeSessionRequest;
use App\Http\Resources\ProgrammeSessionResource;
use App\Models\ProgrammeSession;
use App\Models\Dossier;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Candidat;
use App\Models\Personne;
use App\Models\Utilisateur;
use App\Mail\PermisEmailService;
use Illuminate\Support\Facades\Mail;

/**
 * @OA\Tag(
 *     name="📅 Programme Sessions",
 *     description="Gestion des sessions d'examen pour les dossiers"
 * )
 */
#[Group('Programme sessions', description: 'Gestion des sessions d\'examen pour les dossiers (dossier_id, date_examen). CRUD des sessions programmées.')]
class ProgrammeSessionController extends Controller
{
    /**
     * Liste des programme-sessions. Filtres : dossier_id, date_examen, per_page.
     *
     * @OA\Get(
     *     path="/api/programme-sessions",
     *     operationId="getProgrammeSessions",
     *     tags={"📅 Programme Sessions"},
     *     summary="📋 Liste des programme sessions",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="dossier_id", in="query", @OA\Schema(type="string", format="uuid"), description="Filtrer par dossier"),
     *     @OA\Parameter(name="date_examen", in="query", @OA\Schema(type="string", format="date"), description="Filtrer par date d'examen"),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=15), description="Nombre d'éléments par page"),
     *     @OA\Response(response=200, description="✅ Liste des programme sessions")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection|JsonResponse
    {
        try {
            $query = ProgrammeSession::with(['dossier']);

            // Filtrer par dossier_id si fourni
            if ($request->has('dossier_id')) {
                $query->where('dossier_id', $request->dossier_id);
            }

            // Filtrer par date
            if ($request->has('date_examen')) {
                $query->whereDate('date_examen', $request->date_examen);
            }

            $programmeSessions = $query->latest()->paginate($request->get('per_page', 15));

            return ProgrammeSessionResource::collection($programmeSessions);

        } catch (Exception $e) {
            Log::error('Erreur lors de la récupération des programme sessions', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des programme sessions.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/programme-sessions",
     *     operationId="createProgrammeSession",
     *     tags={"📅 Programme Sessions"},
     *     summary="➕ Créer une programme session",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"dossier_id","date_examen"},
     *             @OA\Property(property="dossier_id", type="string", format="uuid", example="00000000-0000-0000-0000-000000000000"),
     *             @OA\Property(property="date_examen", type="string", format="date", example="2025-12-31")
     *         )
     *     ),
     *     @OA\Response(response=201, description="✅ Programme session créée"),
     *     @OA\Response(response=422, description="❌ Données invalides")
     * )
     */
    public function store(StoreProgrammeSessionRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $programmeSession = ProgrammeSession::create([
                'dossier_id' => $request->dossier_id,
                'date_examen' => $request->date_examen,
            ]);
            $dossier = Dossier::find($request->dossier_id);
            $candidat = Candidat::find($dossier->candidat_id);
            //recupersion de la personne à partir du candidat
            $personne = Personne::find($candidat->personne_id);
            //recuperation de l'utilisateur à partir de la personne
            $utilisateur = Utilisateur::find($personne->user_id);
             if (!empty($utilisateur) && !empty($utilisateur->email)) {
                $data = [
                    'name' => $personne->nom . ' ' . $personne->prenoms,
                    'email' => $utilisateur->email,
                    'titre' => 'Jour d\'examen du permis de conduire',
                    'message' => 'Nous vous informons que le jour de votre examen du permis de conduire est fixé au ' . $request->date_examen,
                ];
                Mail::to($data['email'])->queue(new PermisEmailService($data));
            }

            DB::commit();
            Log::info('Programme session créé', [
                'programme_session_id' => $programmeSession->id,
                'dossier_id' => $programmeSession->dossier_id
            ]);


            return response()->json([
                'success' => true,
                'message' => 'Programme session créé avec succès !',
                'programme_session' => new ProgrammeSessionResource($programmeSession->load('dossier'))
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur lors de la création de la programme session', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la programme session.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/programme-sessions/{id}",
     *     operationId="getProgrammeSession",
     *     tags={"📅 Programme Sessions"},
     *     summary="🔍 Détails d'une programme session",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Response(response=200, description="✅ Détails de la programme session"),
     *     @OA\Response(response=404, description="❌ Programme session non trouvée")
     * )
     */
    public function show(string $id): JsonResponse
    {
        try {
            $programmeSession = ProgrammeSession::with(['dossier'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'programme_session' => new ProgrammeSessionResource($programmeSession)
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Programme session non trouvé.'
            ], 404);

        } catch (Exception $e) {
            Log::error('Erreur lors de la récupération de la programme session', [
                'programme_session_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la programme session.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/programme-sessions/{id}",
     *     operationId="updateProgrammeSession",
     *     tags={"📅 Programme Sessions"},
     *     summary="✏️ Mettre à jour une programme session",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="dossier_id", type="string", format="uuid", example="00000000-0000-0000-0000-000000000000"),
     *             @OA\Property(property="date_examen", type="string", format="date", example="2025-12-31")
     *         )
     *     ),
     *     @OA\Response(response=200, description="✅ Programme session mise à jour"),
     *     @OA\Response(response=404, description="❌ Programme session non trouvée")
     * )
     */
    public function update(UpdateProgrammeSessionRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $programmeSession = ProgrammeSession::findOrFail($id);

            $updateData = [];

            if ($request->has('dossier_id')) {
                $updateData['dossier_id'] = $request->dossier_id;
            }

            if ($request->has('date_examen')) {
                $updateData['date_examen'] = $request->date_examen;
            }

            $programmeSession->update($updateData);

            DB::commit();

            Log::info('Programme session mise à jour', [
                'programme_session_id' => $programmeSession->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Programme session mise à jour avec succès !',
                'programme_session' => new ProgrammeSessionResource($programmeSession->load('dossier'))
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Programme session non trouvé.'
            ], 404);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur lors de la mise à jour de la programme session', [
                'programme_session_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la programme session.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/programme-sessions/{id}",
     *     operationId="deleteProgrammeSession",
     *     tags={"📅 Programme Sessions"},
     *     summary="🗑️ Supprimer une programme session",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Response(response=200, description="✅ Programme session supprimée"),
     *     @OA\Response(response=404, description="❌ Programme session non trouvée")
     * )
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $programmeSession = ProgrammeSession::findOrFail($id);
            $programmeSession->delete();

            DB::commit();

            Log::info('Programme session supprimé', [
                'programme_session_id' => $id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Programme session supprimé avec succès !'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Programme session non trouvé.'
            ], 404);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur lors de la suppression de la programme session', [
                'programme_session_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la programme session.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}
