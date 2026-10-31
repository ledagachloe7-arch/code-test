<?php

namespace App\Http\Requests\Candidat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CompleteProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_naissance' => ['required', 'date', 'before:today'],
            'lieu_naissance' => ['required', 'string', 'max:255'],
            'nip' => ['nullable', 'string', 'max:50', 'unique:candidats,nip'],
            'type_piece' => ['required', 'string', 'max:50'],
            'numero_piece' => ['required', 'string', 'max:50', 'unique:candidats,numero_piece'],
            'nationalite' => ['required', 'string', 'max:100'],
            'genre' => ['required', 'in:M,F'],
        ];
    }

    public function messages(): array
    {
        return [
            'date_naissance.required' => 'La date de naissance est obligatoire.',
            'date_naissance.before' => 'Vous devez avoir au moins 18 ans.',
            'lieu_naissance.required' => 'Le lieu de naissance est obligatoire.',
            'type_piece.required' => 'Le type de pièce d\'identité est obligatoire.',
            'numero_piece.required' => 'Le numéro de pièce est obligatoire.',
            'numero_piece.unique' => 'Ce numéro de pièce est déjà utilisé.',
            'nationalite.required' => 'La nationalité est obligatoire.',
            'genre.required' => 'Le genre est obligatoire.',
            'genre.in' => 'Le genre doit être M (Masculin) ou F (Féminin).',
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

