<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Représentation « complète » d'une auto-école pour `GET /api/auto-ecoles/complets`.
 * Sans `created_at` / `updated_at` au niveau auto-école, sans `dossiers`.
 */
class AutoEcoleCompletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            /** Identifiant unique de l'auto-école (UUID). */
            'id' => $this->id,
            /** Raison sociale ou nom commercial. */
            'nom_auto_ecole' => $this->nom_auto_ecole,
            /** Adresse postale ou localisation. */
            'adresse' => $this->adresse,
            /** Courriel de contact. */
            'email' => $this->email,
            /** UUID de la personne responsable. */
            'responsable_id' => $this->responsable_id,
            /** Téléphone ou contact principal. */
            'contact' => $this->contact,
            /** `true` si l'auto-école est active. */
            'statut' => $this->statut,
            /** Libellé lisible du statut : « Active » ou « Inactive ». */
            'statut_libelle' => $this->statut ? 'Active' : 'Inactive',
            /** Personne responsable (relation chargée). */
            'responsable' => new PersonneResource($this->whenLoaded('responsable')),
            /** Province (référentiel `type_ref=province`) avec `parent` / `children` si chargés. */
            'province' => new ReferentielResource($this->whenLoaded('province')),
            /** Formations proposées avec `type_permis` et `session` — jamais de dossiers. */
            'formations' => FormationAutoEcoleCompletResource::collection($this->whenLoaded('formations')),
        ];
    }
}
