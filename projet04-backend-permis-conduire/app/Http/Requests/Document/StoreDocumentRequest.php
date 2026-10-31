<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'documentable_id' => ['required', 'uuid'],
            'documentable_type' => ['required', 'string'],
            'valide' => ['sometimes', 'boolean'],
            'commentaires' => ['nullable', 'string'],
            'fichier' => ['required', 'file', 'max:5120'],
            'piece_justification_id' => ['nullable', 'string'],

        ];
    }

    public function messages(): array
    {
        return [
            'documentable_id.required' => 'L\'identifiant de l\'entité est obligatoire.',
            'documentable_type.required' => 'Le type d\'entité est obligatoire.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Les données fournies ne sont pas valides.',
                'errors' => $validator->errors(),
            ], 422)
        );
    }

}
