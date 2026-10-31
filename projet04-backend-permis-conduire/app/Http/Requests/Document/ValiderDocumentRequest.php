<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class ValiderDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'valide' => ['required', 'boolean'],
            'commentaires' => ['required_if:valide,false', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'valide.required' => 'Le statut de validation est obligatoire.',
            'commentaires.required_if' => 'Un commentaire est obligatoire en cas de rejet.',
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

