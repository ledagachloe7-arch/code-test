<?php

namespace App\Http\Requests\ProgrammeSession;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateProgrammeSessionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'dossier_id' => ['sometimes', 'uuid', 'exists:dossiers,id'],
            'date_examen' => ['sometimes', 'date', 'after_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'dossier_id.exists' => 'Ce dossier n\'existe pas.',
            'date_examen.date' => 'La date d\'examen doit être une date valide.',
            'date_examen.after_or_equal' => 'La date d\'examen doit être aujourd\'hui ou une date future.',
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
