<?php

namespace App\Http\Requests\Dossier;

use App\Support\DossierDataCategorieInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreDossierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `data_categorie` : accepte objet unique, tableau d’objets ou tableau de chaînes JSON (lignes),
     * et les normalise en **liste d’objets** pour la colonne JSON + transfert CNEDDT.
     *
     * @see DossierDataCategorieInput::normalize()
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('data_categorie')) {
            return;
        }

        $this->merge([
            'data_categorie' => DossierDataCategorieInput::normalize($this->input('data_categorie')),
        ]);
    }

    public function rules(): array
    {
        return [
            'candidat_id' => ['nullable', 'uuid', 'exists:candidats,id'],
            'auto_ecole_id' => ['nullable', 'uuid', 'exists:auto_ecoles,id'],
            'formation_id' => ['nullable', 'uuid', 'exists:formation_auto_ecoles,id'],
            'type_demande_id' => ['nullable', 'uuid', 'exists:type_demandes,id'],
            'statut' => ['required', 'string'],
            'commentaires' => ['nullable', 'string'],
            'referenciel_id' => ['nullable', 'uuid', 'exists:referentiels,id'],
            'numero_permis' => ['nullable', 'string'],
            'numero_origine_permis' => ['nullable', 'string'],
            'date_expiration' => ['nullable', 'date'],
            'lieu_de_dobtention_du_permis' => ['nullable', 'string'],
            'date_de_dobtention_du_permis' => ['nullable', 'date'],
            'date_de_delivrance_du_permis' => ['nullable', 'date'],
            // Généré et figé par le modèle Dossier ; non modifiable via l’API.
            'code_paiement' => ['prohibited'],
            'expired' => ['nullable', 'boolean'],
            'expiration_date' => ['nullable', 'date'],
            'suspended' => ['nullable', 'boolean'],
            'suspended_date' => ['nullable', 'date'],
            'province_id' => ['nullable', 'uuid', 'exists:referentiels,id'],
            // Défini côté serveur à partir du centre de l’utilisateur connecté (voir DossierController::store).
            'centre_id' => ['prohibited'],
            // Données catégorie au format JSON (objet ou tableau). Optionnel.
            'data_categorie' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'candidat_id.uuid' => 'Le candidat doit être un UUID valide.',
            'candidat_id.exists' => 'Le candidat sélectionné n\'existe pas.',
            'auto_ecole_id.uuid' => 'L\'auto-école doit être un UUID valide.',
            'auto_ecole_id.exists' => 'L\'auto-école sélectionnée n\'existe pas.',
            'formation_id.uuid' => 'La formation doit être un UUID valide.',
            'formation_id.exists' => 'La formation sélectionnée n\'existe pas.',
            'type_demande_id.uuid' => 'Le type de demande doit être un UUID valide.',
            'type_demande_id.exists' => 'Le type de demande sélectionné n\'existe pas.',
            'referenciel_id' => 'nullable',
            'uuid',
            'exists:referentiels,id',

        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Les données fournies ne sont pas valides.',
                'errors' => $validator->errors()
            ], 422)
        );
    }
}

