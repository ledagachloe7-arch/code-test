<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PersonneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'utilisateur_id' => $this->utilisateur_id,
            'nom' => $this->nom,
            'prenom' => $this->prenom,
            'nom_complet' => $this->prenom . ' ' . $this->nom,
            'email' => $this->email,
            'contact' => $this->contact,
            'adresse' => $this->adresse,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

