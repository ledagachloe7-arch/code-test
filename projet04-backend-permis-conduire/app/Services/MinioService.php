<?php

namespace App\Services;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Response;
class MinioService
{
    protected $disk = 's3';


    // Upload fichier
    public function upload(
        UploadedFile $file,
        $dossier,
        $uuid,
        $nomUsage
    ): array {
        $year = now()->year;
        $month = now()->format('m');

        $filename = $uuid . '_' . $nomUsage . '.' . $file->getClientOriginalExtension();

        $path = Storage::disk($this->disk)->putFileAs(
            "$year/$month/$dossier",
            $file,
            $filename
        );

        return [
            'path' => $path,
            'url' => Storage::disk($this->disk)->url($path)
        ];
    }

    // Lister fichiers
    public function list(string $dossier): array
    {
        $disk = Storage::disk($this->disk);
        $dossier = trim($dossier, '/');

        $fichiers = collect($disk->allFiles())
            ->filter(fn($chemin) => str_contains(strtoupper($chemin), $dossier))
            ->values()
            ->toArray();

        return array_map(fn(string $chemin) => [
            'chemin' => $chemin,
            'nom' => basename($chemin),
            'url' => $disk->url($chemin),
            'taille' => $disk->size($chemin),
            'modifie_le' => $disk->lastModified($chemin),
            'mime' => $disk->mimeType($chemin),
        ], $fichiers);
    }

    // Obtenir URL d’un fichier
    public function getByPath(string $path)
    {


        if (!Storage::disk($this->disk)->exists($path)) {
            return response()->json(['error' => 'Fichier introuvable'], 404);
        }

        // Génère un lien valide pendant 15 minutes
        $url = Storage::disk($this->disk)->temporaryUrl(
            $path,
            now()->addMinutes(15)
        );

        return response()->json(['url' => $url]);
    }

    // Remplacer fichier
    public function update(
        string $oldPath,
        UploadedFile $file,
        string $dossier,
        string $uuid,
        string $nomUsage
    ): array {
        // 1. Supprimer ancien fichier
        if (Storage::disk($this->disk)->exists($oldPath)) {
            Storage::disk($this->disk)->delete($oldPath);
        }

        // 2. Recréer même structure que upload
        $year = now()->year;
        $month = now()->format('m');

        $filename = $uuid . '_' . $nomUsage . '.' . $file->getClientOriginalExtension();

        $newPath = Storage::disk($this->disk)->putFileAs(
            "$year/$month/$dossier",
            $file,
            $filename
        );

        return [
            'path' => $newPath,
            'url' => Storage::disk($this->disk)->url($newPath)
        ];
    }

    // Supprimer fichier
    public function delete($path): bool
    {
        return Storage::disk($this->disk)->delete($path);
    }
}