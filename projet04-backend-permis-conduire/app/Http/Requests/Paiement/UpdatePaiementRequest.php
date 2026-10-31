<?php

namespace App\Http\Requests\Paiement;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaiementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'montant' => ['sometimes', 'numeric', 'min:0'],

            'code_paiement' => [
                'sometimes',
                'string',
                'max:8',
                Rule::unique('dossiers', 'code_paiement')->ignore($this->route('id'))
            ],

            'reference_paiement' => ['sometimes', 'string', 'max:50'],

            'nom' => ['sometimes', 'string', 'max:50'],

            'prenom' => ['sometimes', 'string', 'max:50'],

            'dossier_id' => ['sometimes', 'exists:dossiers,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'montant.numeric' => 'Le montant doit être un nombre valide.',
            'montant.min' => 'Le montant ne peut pas être négatif.',

            'code_paiement.string' => 'Le code de paiement doit être une chaîne de caractères.',
            'code_paiement.max' => 'Le code de paiement ne doit pas dépasser 8 caractères.',
            'code_paiement.unique' => 'Ce code de paiement est déjà utilisé.',

            'reference_paiement.string' => 'La référence de paiement doit être une chaîne de caractères.',
            'reference_paiement.max' => 'La référence de paiement ne doit pas dépasser 50 caractères.',

            'nom.string' => 'Le nom doit être une chaîne de caractères.',
            'nom.max' => 'Le nom ne doit pas dépasser 50 caractères.',

            'prenom.string' => 'Le prénom doit être une chaîne de caractères.',
            'prenom.max' => 'Le prénom ne doit pas dépasser 50 caractères.',

            'dossier_id.exists' => 'Le dossier sélectionné est invalide.',
        ];
    }

    public function attributes(): array
    {
        return [
            'montant' => 'montant',
            'code_paiement' => 'code de paiement',
            'reference_paiement' => 'référence de paiement',
            'nom' => 'nom',
            'prenom' => 'prénom',
            'dossier_id' => 'dossier',
        ];
    }
}
