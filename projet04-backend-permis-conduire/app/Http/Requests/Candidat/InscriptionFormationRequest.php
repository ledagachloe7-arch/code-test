<?php

namespace App\Http\Requests\Candidat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class InscriptionFormationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'auto_ecole_id' => ['required', 'uuid', 'exists:auto_ecoles,id'],
            'formation_id' => ['required', 'uuid', 'exists:formation_auto_ecoles,id'],
            'commentaires' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'auto_ecole_id.required' => 'L\'auto-école est obligatoire.',
            'auto_ecole_id.exists' => 'Cette auto-école n\'existe pas.',
            'formation_id.required' => 'La formation est obligatoire.',
            'formation_id.exists' => 'Cette formation n\'existe pas.',
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

