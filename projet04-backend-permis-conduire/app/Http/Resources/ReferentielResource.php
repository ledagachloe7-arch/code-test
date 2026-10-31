<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReferentielResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            /** Identifiant unique du référentiel (UUID). */
            'id' => $this->id,
            /** Libellé affiché (ex. Permis B, Centre de Yaoundé). */
            'libelle' => $this->libelle,
            /** Code court unique (ex. B, YAOUNDE). */
            'code' => $this->code,
            /** Type de référentiel (ex. type_permis, centre, province, session). */
            'type_ref' => $this->type_ref,
            /** Description détaillée optionnelle. */
            'description' => $this->description,
            /** Indique si le référentiel est actif (true) ou inactif (false). */
            'statut' => $this->statut,
            /** Libellé du statut : "Actif" ou "Inactif". */
            'statut_libelle' => $this->statut ? 'Actif' : 'Inactif',
            /** Date de création (ISO 8601). */
            'created_at' => $this->created_at?->toIso8601String(),
            /** Date de dernière modification (ISO 8601). */
            'updated_at' => $this->updated_at?->toIso8601String(),
            /** Montant associé si applicable (ex. tarif). */
            'montant' => $this->montant,
            /** UUID du référentiel type de demande lié (optionnel). */
            'type_demande' => $this->type_demande,
            /** UUID du référentiel type de permis lié (optionnel). */
            'type_permis' => $this->type_permis,
            /** UUID du référentiel parent pour la hiérarchie (optionnel). */
            'parent_id' => $this->parent_id,
            /** Objet référentiel parent, présent si la relation est chargée. */
            'parent' => $this->whenLoaded('parent', fn () => new ReferentielResource($this->parent)),
            /** Liste des référentiels enfants, présente si la relation est chargée. */
            'children' => $this->whenLoaded('children', fn () => ReferentielResource::collection($this->children)),
        ];
    }
}

