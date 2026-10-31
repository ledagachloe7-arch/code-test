<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UtilisateurResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $array = [
            'id' => $this->id,
            'email' => $this->email,
            'telephone' => $this->telephone,
            'role' => $this->role,
            'centre_id' => $this->centre_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];

        if ($this->relationLoaded('personne')) {
            $array['personne'] = $this->personne ? [
                'id' => $this->personne->id,
                'nom' => $this->personne->nom,
                'prenom' => $this->personne->prenom,
                'email' => $this->personne->email,
                'contact' => $this->personne->contact,
            ] : null;
        }

        if ($this->relationLoaded('centre') && $this->centre) {
            $array['centre'] = [
                'id' => $this->centre->id,
                'libelle' => $this->centre->libelle,
                'code' => $this->centre->code,
            ];
        }

        return $array;
    }
}