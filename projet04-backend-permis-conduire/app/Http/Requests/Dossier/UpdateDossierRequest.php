<?php

namespace App\Http\Requests\Dossier;

use App\Support\DossierDataCategorieInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateDossierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @see StoreDossierRequest::prepareForValidation()
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
            'auto_ecole_id' => ['nullable', 'uuid', 'exists:auto_ecoles,id'],
            'type_demande_id' => ['nullable', 'uuid', 'exists:type_demandes,id'],
            'formation_id' => ['nullable', 'uuid', 'exists:formation_auto_ecoles,id'],
            'statut' => ['sometimes', 'string'],
            'date_modification' => ['nullable', 'date'],
            'commentaires' => ['nullable', 'string'],
            'referenciel_id' => ['nullable', 'uuid', 'exists:referentiels,id'],
            'numero_permis' => ['nullable', 'string'],
            'numero_origine_permis' => ['nullable', 'string'],
            'lieu_de_dobtention_du_permis' => ['nullable', 'string'],
            'date_de_dobtention_du_permis' => ['nullable', 'date'],
            'date_de_delivrance_du_permis' => ['nullable', 'date'],
            'expired' => ['nullable', 'boolean'],
            'expiration_date' => ['nullable', 'date'],
            'suspended' => ['nullable', 'boolean'],
            'suspended_date' => ['nullable', 'date'],
            'province_id' => ['nullable', 'uuid', 'exists:referentiels,id'],
            'centre_id' => ['nullable', 'uuid', 'exists:referentiels,id'],
            // Données catégorie au format JSON (objet ou tableau). Optionnel.
            'data_categorie' => ['nullable', 'array'],
            // Non modifiable via l’API (géré par le modèle Dossier).
            'code_paiement' => ['prohibited'],
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

