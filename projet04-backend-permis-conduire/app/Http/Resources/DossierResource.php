<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DossierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'candidat_id' => $this->candidat_id,
            'auto_ecole_id' => $this->auto_ecole_id,
            'formation_id' => $this->formation_id,
            'type_demande_id' => $this->type_demande_id,
            'statut' => $this->statut,
            'date_creation' => $this->date_creation?->format('Y-m-d'),
            'date_modification' => $this->date_modification?->format('Y-m-d'),
            'commentaires' => $this->commentaires,
            //'referenciel_id' => $this->referenciel_id,
            'expired' => $this->expired ?? false,
            'expiration_date' => $this->expiration_date?->format('Y-m-d'),
            'suspended' => $this->suspended ?? false,
            'suspended_date' => $this->suspended_date?->format('Y-m-d'),
            'province_id' => $this->province_id,
            'centre_id' => $this->centre_id,
            /** Données catégorie (JSON nullable) : objet ou tableau libre, stocké en base en format JSON. */
            'data_categorie' => $this->data_categorie,
            'is_locked' => $this->is_locked ?? false,
            'opened_by' => $this->opened_by,
            'opened_at' => $this->opened_at?->toIso8601String(),
            'numero_permis' => $this->numero_permis,
            'numero_origine_permis' => $this->numero_origine_permis,
            'code_paiement'=>$this->code_paiement,

            // Relations
            'candidat' => new CandidatResource($this->whenLoaded('candidat')),
            'auto_ecole' => new AutoEcoleResource($this->whenLoaded('autoEcole')),
            'formation' => new FormationAutoEcoleResource($this->whenLoaded('formation')),
            'type_demande' => new TypeDemandeResource($this->whenLoaded('typeDemande')),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            'programme_sessions' => ProgrammeSessionResource::collection($this->whenLoaded('programmeSessions')),
            'referentiel' => new ReferentielResource($this->whenLoaded('referentiel')),
            'province' => new ReferentielResource($this->whenLoaded('province')),
            'centre' => new ReferentielResource($this->whenLoaded('centre')),
            'opened_by_user' => $this->whenLoaded('openedByUser', function () {
                $u = $this->openedByUser;
                if (!$u) {
                    return null;
                }
                $p = $u->personne ?? null;
                return [
                    'id' => $u->id,
                    'email' => $u->email,
                    'nom' => $p ? trim($p->nom . ' ' . $p->prenom) : $u->email,
                ];
            }),
            //referenciel

            //id alfresco du dossier
            'alfresco_node_id' => $this->alfresco_node_id,

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

