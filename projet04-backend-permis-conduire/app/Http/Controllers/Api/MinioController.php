<?php

namespace App\Http\Controllers\Api;

use App\Services\MinioService;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class MinioController extends Controller
{
    protected $minioService;

    public function __construct(MinioService $minioService)
    {
        $this->minioService = $minioService;
    }

    // 📤 Upload fichier
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file',
            'dossier' => 'required|string',
            'uuid' => 'required|string',
            'nomUsage' => 'required|string'
        ]);

        $result = $this->minioService->upload(
            $request->file('file'),
            $request->dossier,
            $request->uuid,
            $request->nomUsage
        );

        return response()->json([
            'message' => 'Fichier uploadé avec succès',
            ...$result
        ]);
    }

    // 📁 Lister fichiers
    public function list(Request $request)
    {
        $request->validate([
            'dossier' => 'required|string'
        ]);

        $files = $this->minioService->list($request->dossier);
        //dd($files);
        if (empty($files)) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun fichier trouvé dans ce dossier.',
                'files' => []
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Fichiers récupérés avec succès.',
            'files' => $files
        ]);
    }

    // 🔗 Récupérer URL via path
    public function getByPath($nodeId)
    {
      
        return response()->json(
            $this->minioService->getByPath($nodeId)
        );
    }

    // 🔄 Update fichier
    public function update(Request $request)
    {
        $request->validate([
            'file' => 'required|file',
            'oldPath' => 'required|string',
            'dossier' => 'required|string',
            'uuid' => 'required|string',
            'nomUsage' => 'required|string'
        ]);

        $result = $this->minioService->update(
            $request->oldPath,
            $request->file('file'),
            $request->dossier,
            $request->uuid,
            $request->nomUsage
        );

        return response()->json([
            'message' => 'Fichier mis à jour',
            ...$result
        ]);
    }

    // ❌ Supprimer fichier
    public function delete(Request $request)
    {
        $request->validate([
            'path' => 'required|string'
        ]);

        $this->minioService->delete($request->path);

        return response()->json([
            'message' => 'Fichier supprimé'
        ]);
    }
}