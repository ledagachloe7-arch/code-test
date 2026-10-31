<?php

namespace App\Http\Requests\Paiement;

use Illuminate\Foundation\Http\FormRequest;

class StorePaiementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'montant' => ['required', 'numeric', 'min:0'],
            'code_paiement' => ['required', 'string', 'max:8', 'unique:dossiers,code_paiement'],
            'reference_paiement' => ['required', 'string', 'max:50'],
            'nom' => ['required','string', 'max:50'],
            'dossier_id' => ['required', 'exists:dossiers,id'],
            'prenom' => ['required','string', 'max:50'],
        ];
    }

    public function messages(): array
{
    return [
        'montant.required' => 'Le montant est obligatoire.',
        'montant.numeric' => 'Le montant doit être un nombre valide.',
        'montant.min' => 'Le montant ne peut pas être négatif.',

        'code_paiement.required' => 'Le code de paiement est obligatoire.',
        'code_paiement.string' => 'Le code de paiement doit être une chaîne de caractères.',
        'code_paiement.max' => 'Le code de paiement ne doit pas dépasser 8 caractères.',
        'code_paiement.unique' => 'Ce code de paiement est déjà utilisé.',

        'reference_paiement.required' => 'La référence de paiement est obligatoire.',
        'reference_paiement.string' => 'La référence de paiement doit être une chaîne de caractères.',
        'reference_paiement.max' => 'La référence de paiement ne doit pas dépasser 50 caractères.',

        'nom.required' => 'Le nom est obligatoire.',
        'nom.string' => 'Le nom doit être une chaîne de caractères.',
        'nom.max' => 'Le nom ne doit pas dépasser 50 caractères.',

        'prenom.required' => 'Le prénom est obligatoire.',
        'prenom.string' => 'Le prénom doit être une chaîne de caractères.',
        'prenom.max' => 'Le prénom ne doit pas dépasser 50 caractères.',

        'dossier_id.required' => 'Le dossier est obligatoire.',
        'dossier_id.exists' => 'Le dossier sélectionné est invalide.',
    ];
}
}