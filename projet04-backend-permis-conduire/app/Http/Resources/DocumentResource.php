<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'documentable_id' => $this->documentable_id,
            'documentable_type' => $this->documentable_type,
            'nom_fichier' => $this->nom_fichier,
            'chemin_fichier' => $this->chemin_fichier,
            'type_mime' => $this->type_mime,
            'taille_fichier' => $this->taille_fichier,
            'taille_fichier_formate' => $this->formatFileSize($this->taille_fichier),
            'valide' => $this->valide,
            'valide_libelle' => $this->valide ? 'Validé' : 'En attente',
            'commentaires' => $this->commentaires,
            'piece_justification_id' => $this->piece_justification_id,
            
            // Relations
            'documentable' => $this->whenLoaded('documentable'),
            
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function formatFileSize($bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }
}

