<?php

namespace App\Http\Requests\FormationAutoEcole;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateFormationAutoEcoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'montant' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'statut' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'montant.min' => 'Le montant doit être positif.',
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

