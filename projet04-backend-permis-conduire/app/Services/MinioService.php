<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Response;

class MinioService
{
    protected $disk = 's3';

    /**
     * Vérifie et crée automatiquement le bucket s'il n'existe pas encore.
     */
    public function ensureBucketExists(): void
    {
        try {
            $bucket = config('filesystems.disks.s3.bucket');
            if (empty($bucket)) {
                Log::warning('Minio ensureBucketExists : nom de bucket vide dans config/filesystems.php.');
                return;
            }

            /** @var \Aws\S3\S3Client $client */
            $client = Storage::disk($this->disk)->getClient();
            if ($client && !$client->doesBucketExist((string) $bucket)) {
                $client->createBucket(['Bucket' => (string) $bucket]);
                Log::info("Bucket MinIO [$bucket] créé avec succès.");
            }
        } catch (\Throwable $e) {
            Log::error('Minio ensureBucketExists : ' . $e->getMessage());
        }
    }

    /**
     * Téléverse un fichier dans MinIO.
     */
    public function upload(
        UploadedFile $file,
        $dossier = 'general',
        $uuid = null,
        $nomUsage = 'doc'
    ): array {
        $this->ensureBucketExists();

        $year = now()->year;
        $month = now()->format('m');

        $uuid = $uuid ?: (string) \Illuminate\Support\Str::uuid();
        $safeDossier = preg_replace('/[^A-Za-z0-9_-]/', '_', (string) $dossier);
        $safeNomUsage = preg_replace('/[^A-Za-z0-9_-]/', '_', (string) $nomUsage);
        $extension = $file->getClientOriginalExtension() ?: 'bin';

        $filename = "{$uuid}_{$safeNomUsage}.{$extension}";
        $folderPath = "{$year}/{$month}/{$safeDossier}";

        try {
            $path = Storage::disk($this->disk)->putFileAs(
                $folderPath,
                $file,
                $filename
            );
        } catch (\Throwable $e) {
            Log::error('MinioService upload error : ' . $e->getMessage());
            return [
                'success' => false,
                'path' => null,
                'url' => null,
                'filename' => $filename,
                'error' => $e->getMessage(),
            ];
        }

        if ($path === false || empty($path)) {
            Log::error('MinioService upload : putFileAs a retourné false.', [
                'bucket' => config('filesystems.disks.s3.bucket'),
                'endpoint' => config('filesystems.disks.s3.endpoint'),
                'folder' => $folderPath,
                'filename' => $filename,
            ]);
            return [
                'success' => false,
                'path' => null,
                'url' => null,
                'filename' => $filename,
                'error' => 'Échec du téléversement vers MinIO (putFileAs a échoué).',
            ];
        }

        $url = null;
        try {
            $url = Storage::disk($this->disk)->url($path);
        } catch (\Throwable $e) {
            $url = null;
        }

        return [
            'success' => true,
            'path' => $path,
            'url' => $url,
            'filename' => $filename,
        ];
    }

    /**
     * Liste les fichiers d'un dossier.
     */
    public function list(string $dossier): array
    {
        $this->ensureBucketExists();

        $disk = Storage::disk($this->disk);
        $dossier = trim($dossier, '/');

        $fichiers = collect($disk->allFiles())
            ->filter(fn($chemin) => str_contains(strtoupper($chemin), strtoupper($dossier)))
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

    /**
     * Génère une URL temporaire signée d’un fichier pour visualisation.
     */
    public function getByPath(string $path)
    {
        try {
            if (!Storage::disk($this->disk)->exists($path)) {
                return response()->json(['error' => 'Fichier introuvable dans MinIO'], 404);
            }

            // Lien temporaire valide 15 minutes
            $url = Storage::disk($this->disk)->temporaryUrl(
                $path,
                now()->addMinutes(15)
            );

            return response()->json(['url' => $url]);
        } catch (\Throwable $e) {
            Log::error('MinioService getByPath error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remplace un fichier existant.
     */
    public function update(
        string $oldPath,
        UploadedFile $file,
        string $dossier,
        string $uuid,
        string $nomUsage
    ): array {
        $this->ensureBucketExists();

        if (Storage::disk($this->disk)->exists($oldPath)) {
            Storage::disk($this->disk)->delete($oldPath);
        }

        return $this->upload($file, $dossier, $uuid, $nomUsage);
    }

    /**
     * Supprime un fichier.
     */
    public function delete($path): bool
    {
        return Storage::disk($this->disk)->delete($path);
    }
}
