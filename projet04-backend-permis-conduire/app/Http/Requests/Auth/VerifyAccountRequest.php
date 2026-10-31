<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class VerifyAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'size:8', 'regex:/^[0-9]{8}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'identifier.required' => 'L\'identifiant (email ou téléphone) est obligatoire.',
            'code.required' => 'Le code de vérification est obligatoire.',
            'code.size' => 'Le code de vérification doit contenir exactement 8 chiffres.',
            'code.regex' => 'Le code de vérification doit contenir uniquement des chiffres.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Erreur de validation des données.',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}



