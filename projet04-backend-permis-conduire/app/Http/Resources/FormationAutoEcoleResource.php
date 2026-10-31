<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FormationAutoEcoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'auto_ecole_id' => $this->auto_ecole_id,
            'type_permis_id' => $this->type_permis_id,
            'montant' => (float) $this->montant,
            'montant_formate' => number_format($this->montant, 0, ',', ' ') . ' FCFA',
            'description' => $this->description,
            'session_id' => $this->session_id,
            'statut' => $this->statut,
            'statut_libelle' => $this->statut ? 'Active' : 'Inactive',
            
            // Relations
            'auto_ecole' => new AutoEcoleResource($this->whenLoaded('autoEcole')),
            'type_permis' => new ReferentielResource($this->whenLoaded('typePermis')),
            'session' => new ReferentielResource($this->whenLoaded('session')),
            'dossiers' => DossierResource::collection($this->whenLoaded('dossiers')),
            
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

