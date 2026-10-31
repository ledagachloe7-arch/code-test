<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaiementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'montant' => $this->montant,
            'code_paiement' => $this->code_paiement,
            'reference_paiement' => $this->reference_paiement,

            'nom_complet' => trim($this->prenom . ' ' . $this->nom),

            'nom' => $this->nom,
            'prenom' => $this->prenom,

            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),

            // Relation dossier
            'dossier' => new DossierResource($this->whenLoaded('dossier')),
        ];
    }
}