<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PieceJustificativeResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'obligatoire' => $this->obligatoire,
            // Renvoie le libellé du type de document (referentiel)
            'libelle' => $this->libelle,
        ];
    }
}

