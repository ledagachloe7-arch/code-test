<?php

namespace App\Http\Requests\Candidat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreCandidatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'personne_id' => ['required', 'uuid', 'exists:personnes,id'],
            'numero_candidat' => ['required', 'string', 'max:50', 'unique:candidats,numero_candidat'],
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
            'personne_id.required' => 'L\'ID de la personne est obligatoire.',
            'personne_id.exists' => 'Cette personne n\'existe pas.',
            'numero_candidat.required' => 'Le numéro de candidat est obligatoire.',
            'numero_candidat.unique' => 'Ce numéro de candidat existe déjà.',
            'date_naissance.required' => 'La date de naissance est obligatoire.',
            'date_naissance.before' => 'La date de naissance doit être antérieure à aujourd\'hui.',
            'lieu_naissance.required' => 'Le lieu de naissance est obligatoire.',
            'nip.unique' => 'Ce NIP existe déjà.',
            'type_piece.required' => 'Le type de pièce est obligatoire.',
            'numero_piece.required' => 'Le numéro de pièce est obligatoire.',
            'numero_piece.unique' => 'Ce numéro de pièce existe déjà.',
            'nationalite.required' => 'La nationalité est obligatoire.',
            'genre.required' => 'Le genre est obligatoire.',
            'genre.in' => 'Le genre doit être M ou F.',
        ];
    }

    public function attributes(): array
    {
        return [
            'personne_id' => 'personne',
            'numero_candidat' => 'numéro de candidat',
            'date_naissance' => 'date de naissance',
            'lieu_naissance' => 'lieu de naissance',
            'nip' => 'NIP',
            'type_piece' => 'type de pièce',
            'numero_piece' => 'numéro de pièce',
            'nationalite' => 'nationalité',
            'genre' => 'genre',
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

