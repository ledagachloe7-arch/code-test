<?php

namespace App\Http\Requests\FormationAutoEcole;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreFormationAutoEcoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'auto_ecole_id' => ['required', 'uuid', 'exists:auto_ecoles,id'],
            'type_permis_id' => ['required', 'uuid', 'exists:referentiels,id'],
            'montant' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'session_id' => ['required', 'uuid', 'exists:referentiels,id'],
            'statut' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'auto_ecole_id.required' => 'L\'auto-école est obligatoire.',
            'auto_ecole_id.exists' => 'Cette auto-école n\'existe pas.',
            'type_permis_id.required' => 'Le type de permis est obligatoire.',
            'type_permis_id.exists' => 'Ce type de permis n\'existe pas.',
            'montant.required' => 'Le montant est obligatoire.',
            'montant.min' => 'Le montant doit être positif.',
            'session_id.required' => 'La session est obligatoire.',
            'session_id.exists' => 'Cette session n\'existe pas.',
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

