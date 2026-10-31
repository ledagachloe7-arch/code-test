<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type_document_id' => ['required', 'uuid', 'exists:referentiels,id'],
            'fichier' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // 5MB max
            'commentaires' => ['nullable', 'string', 'max:500'],
            'numero_permis' => ['nullable', 'string'],
            'numero_origine_permis' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'type_document_id.required' => 'Le type de document est obligatoire.',
            'type_document_id.exists' => 'Ce type de document n\'existe pas.',
            'fichier.required' => 'Le fichier est obligatoire.',
            'fichier.file' => 'Le fichier doit être un fichier valide.',
            'fichier.mimes' => 'Le fichier doit être au format PDF, JPG, JPEG ou PNG.',
            'fichier.max' => 'Le fichier ne doit pas dépasser 5 MB.',
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

