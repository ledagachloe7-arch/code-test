<?php

namespace App\Http\Requests\Referentiel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class UpdateReferentielRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $referentielId = $this->route('referentiel');
        $parentIdRules = ['nullable', 'uuid', 'exists:referentiels,id'];
        if ($referentielId !== null) {
            $id = $referentielId instanceof \App\Models\Referentiel ? $referentielId->id : $referentielId;
            $parentIdRules[] = Rule::notIn([$id]);
        }

        return [
            // Libellé affiché. Optionnel en mise à jour, max 255 caractères.
            'libelle' => ['sometimes', 'string', 'max:255'],
            // Code court. Optionnel en mise à jour.
            'code' => ['sometimes', 'string'],
            // Description détaillée. Optionnel.
            'description' => ['nullable', 'string'],
            // Statut actif (true) ou inactif (false). Optionnel.
            'statut' => ['sometimes', 'boolean'],
            // Type de référentiel. Optionnel en mise à jour.
            'type_ref' => ['sometimes', 'string'],
            // Montant. Optionnel, format décimal 2 décimales max.
            'montant' => [
                'nullable',
                'numeric',
                'regex:/^\d+(\.\d{1,2})?$/'
            ],
            // UUID référentiel type de demande. Optionnel.
            'type_demande' => ['nullable'],
            // UUID référentiel type de permis. Optionnel.
            'type_permis' => ['nullable'],
            // UUID du référentiel parent. Optionnel ; ne peut pas être l’id du référentiel lui-même.
            'parent_id' => $parentIdRules,
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

