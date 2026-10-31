<?php

namespace App\Http\Requests\Referentiel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreReferentielRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Libellé affiché du référentiel (ex. Permis B, Centre de Yaoundé). Obligatoire, max 255 caractères.
            'libelle' => ['required', 'string', 'max:255'],
            // Code court unique (ex. B, YAOUNDE). Obligatoire, max 50 caractères, doit être unique dans la table.
            'code' => ['required', 'string', 'max:50', 'unique:referentiels,code'],
            // Type de référentiel (ex. type_permis, centre, province, session). Obligatoire, max 100 caractères.
            'type_ref' => ['required', 'string', 'max:100'],
            // Description détaillée optionnelle.
            'description' => ['nullable', 'string'],
            // Indique si le référentiel est actif (true) ou inactif (false). Optionnel.
            'statut' => ['sometimes', 'boolean'],
            // Montant associé si applicable (ex. tarif). Optionnel, format décimal 2 décimales max.
            'montant' => [
                'nullable',
                'numeric',
                'regex:/^\d+(\.\d{1,2})?$/'
            ],
            // UUID d'un référentiel type de demande associé. Optionnel, doit exister dans referentiels.
            'type_demande' => ['nullable'],
            // UUID d'un référentiel type de permis associé. Optionnel, doit exister dans referentiels.
            'type_permis' => ['nullable'],
            // UUID du référentiel parent pour la hiérarchie. Optionnel ; doit exister dans referentiels.
            'parent_id' => ['nullable', 'uuid', 'exists:referentiels,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'libelle.required' => 'Le libellé est obligatoire.',
            'code.required' => 'Le code est obligatoire.',
            'code.unique' => 'Ce code existe déjà.',
            'type_ref.required' => 'Le type de référentiel est obligatoire.',
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

