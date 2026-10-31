<?php

namespace App\Http\Requests\Resultat;

use Illuminate\Foundation\Http\FormRequest;

class UpdateResultatRequest extends FormRequest
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
            'dossier_id' => ['required', 'uuid', 'exists:dossiers,id'],
            'typeExamen' => ['string', 'nullable'],
            'statut' => ['string', 'required'],
            'date' => ['date'],
            'commentaire' => ['string', 'nullable']
        ];
    }


    public function messages(): array
    {
        return [
            'dossier_id.required' => 'Le dossier est obligatoire.',
            'dossier_id.uuid' => 'L’identifiant du dossier est invalide.',
            'dossier_id.exists' => 'Le dossier sélectionné est introuvable.',

            'typeExamen.string' => 'Le type d’examen doit être une chaîne de caractères.',

            'statut.required' => 'Le statut du résultat est obligatoire.',
            'statut.string' => 'Le statut doit être une chaîne de caractères.',

            'date.date' => 'La date fournie n’est pas valide.',

            'commentaire.string' => 'Le commentaire doit être une chaîne de caractères.'
        ];
    }
}
