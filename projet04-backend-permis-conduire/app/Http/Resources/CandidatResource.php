<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CandidatResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'personne_id' => $this->personne_id,
            'numero_candidat' => $this->numero_candidat,
            'date_naissance' => $this->date_naissance?->format('Y-m-d'),
            'lieu_naissance' => $this->lieu_naissance,
            'nip' => $this->nip,
            'type_piece' => $this->type_piece,
            'numero_piece' => $this->numero_piece,
            'nationalite' => $this->nationalite,
            'genre' => $this->genre,
            'age' => $this->date_naissance ? $this->date_naissance->age : null,
            
            // Relations
            'personne' => new PersonneResource($this->whenLoaded('personne')),
            'dossiers' => DossierResource::collection($this->whenLoaded('dossiers')),
            
            // Dates
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

