<?php

namespace App\Http\Requests\Candidat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class UpdateCandidatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $candidatId = $this->route('candidat');

        return [
            'numero_candidat' => ['sometimes', 'string', 'max:50', Rule::unique('candidats', 'numero_candidat')->ignore($candidatId)],
            'date_naissance' => ['sometimes', 'date', 'before:today'],
            'lieu_naissance' => ['sometimes', 'string', 'max:255'],
            'nip' => ['nullable', 'sometimes', 'string', 'max:50', Rule::unique('candidats', 'nip')->ignore($candidatId)],
            'type_piece' => ['sometimes', 'string', 'max:50'],
            'numero_piece' => ['sometimes', 'string', 'max:50', Rule::unique('candidats', 'numero_piece')->ignore($candidatId)],
            'nationalite' => ['sometimes', 'string', 'max:100'],
            'genre' => ['sometimes', 'in:M,F'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero_candidat.unique' => 'Ce numéro de candidat existe déjà.',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui.',
            'nip.unique' => 'Ce NIP existe déjà.',
            'numero_piece.unique' => 'Ce numéro de pièce existe déjà.',
            'genre.in' => 'Le genre doit être M ou F.',
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

