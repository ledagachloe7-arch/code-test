<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ModificationException;
use App\Http\Controllers\Controller;
use App\Models\ModificationDemande;
use App\Services\ModificationDemandeService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

#[Group('Mise à jour des informations personnelles', description: 'Demandes de modification (nom, prénom, date et lieu de naissance, nationalité) : brouillon → soumise → approuvée/rejetée par un responsable habilité distinct du demandeur.')]
class ModificationDemandeController extends Controller
{
    public function __construct(protected ModificationDemandeService $service)
    {
    }

    private function agent(Request $request)
    {
        return $request->attributes->get('authenticated_user');
    }

    private function erreur(ModificationException $e): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status());
    }

    private function reglesSaisie(): array
    {
        return [
            'champ' => 'required|string|in:' . implode(',', array_keys(config('modifications.champs'))),
            'nouvelle_valeur' => 'nullable|string|max:100',
            'ville' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'pays' => 'nullable|string|max:100',
            'motif' => 'nullable|string|max:2000',
            'justificatif' => 'nullable|file|max:' . config('modifications.justificatif_max_ko')
                . '|mimes:' . implode(',', config('modifications.justificatif_types')),
            'soumettre' => 'nullable|boolean',
        ];
    }

    #[Endpoint(title: 'Fiche titulaire pour mise à jour', description: 'Paramètre : id d\'une ligne h_permis du titulaire. Valeurs actuelles (lecture seule), âge, catégories, historique des demandes et droit de validation.')]
    public function fiche(Request $request, string $hPermisId): JsonResponse
    {
        try {
            return response()->json(['success' => true, 'data' => $this->service->fiche($hPermisId, $this->agent($request))]);
        } catch (ModificationException $e) {
            return $this->erreur($e);
        }
    }

    #[Endpoint(title: 'Créer une demande de modification', description: 'multipart/form-data : champ, nouvelle_valeur (ou ville/province/pays pour le lieu de naissance), motif, justificatif (pdf/jpg/png), soumettre (true = soumettre directement, sinon brouillon).')]
    public function store(Request $request, string $hPermisId): JsonResponse
    {
        $data = $request->validate($this->reglesSaisie());
        try {
            $d = $this->service->creer($hPermisId, $data, $request->file('justificatif'), $this->agent($request), $request->boolean('soumettre'));
            return response()->json(['success' => true, 'message' => $this->messageStatut($d), 'data' => $d], 201);
        } catch (ModificationException $e) {
            return $this->erreur($e);
        }
    }

    #[Endpoint(title: 'Modifier un brouillon', description: 'Uniquement par le demandeur, tant que la demande est au statut BROUILLON. Mêmes champs que la création.')]
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate($this->reglesSaisie());
        try {
            $d = $this->service->modifierBrouillon($id, $data, $request->file('justificatif'), $this->agent($request), $request->boolean('soumettre'));
            return response()->json(['success' => true, 'message' => $this->messageStatut($d), 'data' => $d]);
        } catch (ModificationException $e) {
            return $this->erreur($e);
        }
    }

    #[Endpoint(title: 'Soumettre un brouillon', description: 'Contrôle des champs obligatoires et du justificatif, puis passage au statut SOUMISE (date/heure serveur).')]
    public function soumettre(Request $request, string $id): JsonResponse
    {
        try {
            $d = $this->service->soumettre($id, $this->agent($request));
            return response()->json(['success' => true, 'message' => $this->messageStatut($d), 'data' => $d]);
        } catch (ModificationException $e) {
            return $this->erreur($e);
        }
    }

    #[Endpoint(title: 'Supprimer un brouillon', description: 'Uniquement un brouillon, par son demandeur. Une demande soumise n\'est jamais supprimée (historique).')]
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $this->service->supprimerBrouillon($id, $this->agent($request));
            return response()->json(['success' => true, 'message' => 'Brouillon supprimé.']);
        } catch (ModificationException $e) {
            return $this->erreur($e);
        }
    }

    #[Endpoint(title: 'Demandes à valider', description: 'Demandes au statut SOUMISE. Chaque demande indique `refus_decision` si l\'agent connecté ne peut pas décider (non habilité, validation renforcée, séparation des tâches).')]
    public function aValider(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        return response()->json([
            'success' => true,
            'peut_valider' => $this->service->estValidateur($agent),
            'data' => $this->service->aValider($agent),
        ]);
    }

    #[Endpoint(title: 'Approuver une demande', description: 'Responsable habilité, distinct du demandeur. Met à jour la donnée active sur toutes les catégories du titulaire ; l\'ancienne valeur reste dans l\'historique. Body : commentaire (facultatif).')]
    public function approuver(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['commentaire' => 'nullable|string|max:2000']);
        try {
            $d = $this->service->approuver($id, $this->agent($request), $data['commentaire'] ?? null);
            return response()->json(['success' => true, 'message' => 'Demande approuvée : la modification est appliquée.', 'data' => $d]);
        } catch (ModificationException $e) {
            return $this->erreur($e);
        }
    }

    #[Endpoint(title: 'Rejeter une demande', description: 'Responsable habilité, distinct du demandeur. Motif obligatoire. Le dossier n\'est pas modifié.')]
    public function rejeter(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['motif' => 'required|string|max:2000']);
        try {
            $d = $this->service->rejeter($id, $this->agent($request), $data['motif']);
            return response()->json(['success' => true, 'message' => 'Demande rejetée : le dossier n\'est pas modifié.', 'data' => $d]);
        } catch (ModificationException $e) {
            return $this->erreur($e);
        }
    }

    #[Endpoint(title: 'Télécharger le justificatif', description: 'Accessible uniquement au demandeur et aux responsables habilités. Accès journalisé.')]
    public function justificatif(Request $request, string $id)
    {
        $agent = $this->agent($request);
        $d = ModificationDemande::find($id);
        if (! $d || ! $d->justificatif_path) {
            return response()->json(['success' => false, 'message' => 'Justificatif introuvable.'], 404);
        }
        if (! $this->service->peutVoirJustificatif($agent, $d)) {
            return response()->json(['success' => false, 'message' => 'Accès au justificatif non autorisé.'], 403);
        }

        Log::info('[Modification] Consultation justificatif', ['id' => $d->id, 'agent_id' => $agent->id ?? null]);

        $disk = Storage::disk(config('modifications.disk'));
        if (! $disk->exists($d->justificatif_path)) {
            return response()->json(['success' => false, 'message' => 'Fichier introuvable sur le stockage.'], 404);
        }

        return response($disk->get($d->justificatif_path), 200, [
            'Content-Type' => $d->justificatif_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . addslashes($d->justificatif_nom ?: 'justificatif') . '"',
        ]);
    }

    private function messageStatut(ModificationDemande $d): string
    {
        return $d->statut === ModificationDemande::STATUT_SOUMISE
            ? "Demande {$d->numero} soumise : en attente de validation."
            : "Brouillon {$d->numero} enregistré.";
    }
}
