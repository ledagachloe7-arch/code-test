<?php

namespace App\Http\Requests\Dossier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class ValiderDossierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'statut' => ['required', 'in:valide,rejete'],
            'commentaires' => ['required_if:statut,rejete', 'string', 'max:1000'],
            'numero_permis' => ['nullable', 'string'],
            'numero_origine_permis' => ['nullable', 'string'],
            'lieu_de_dobtention_du_permis' => ['nullable', 'string'],
            'date_de_dobtention_du_permis' => ['nullable', 'date'],
            'date_de_delivrance_du_permis' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'statut.required' => 'Le statut est obligatoire.',
            'statut.in' => 'Le statut doit être "valide" ou "rejete".',
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

