<?php

namespace App\Http\Requests\Transitions;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $transitionId = $this->route('transition')->id;

        return [
            'code' => 'sometimes|string|max:50|unique:transitions,code,' . $transitionId,
            'libelle' => 'sometimes|string|max:255',
            'source_etape_id' => 'sometimes|exists:etapes,id',
            'cible_etape_id' => 'sometimes|exists:etapes,id|different:source_etape_id',
            'circuit_id' => 'required|uuid|exists:circuits,id',
        ];
    }

    public function messages(): array
{
    return [
        'code.required' => 'Le code de la transition est obligatoire.',
        'code.string' => 'Le code de la transition doit être une chaîne de caractères.',
        'code.max' => 'Le code de la transition ne peut pas dépasser 50 caractères.',
        'code.unique' => 'Ce code de transition existe déjà.',

        'libelle.required' => 'Le libellé de la transition est obligatoire.',
        'libelle.string' => 'Le libellé doit être une chaîne de caractères.',
        'libelle.max' => 'Le libellé ne peut pas dépasser 255 caractères.',

        'source_etape_id.required' => 'L’étape source est obligatoire.',
        'source_etape_id.uuid' => 'L’identifiant de l’étape source doit être un UUID valide.',
        'source_etape_id.exists' => 'L’étape source spécifiée est introuvable dans la base de données.',

        'cible_etape_id.required' => 'L’étape cible est obligatoire.',
        'cible_etape_id.uuid' => 'L’identifiant de l’étape cible doit être un UUID valide.',
        'cible_etape_id.exists' => 'L’étape cible spécifiée est introuvable dans la base de données.',
        'cible_etape_id.different' => 'L’étape cible doit être différente de l’étape source.',

        'circuit_id.required' => 'Le circuit associé à la transition est obligatoire.',
        'circuit_id.uuid' => 'L’identifiant du circuit doit être un UUID valide.',
        'circuit_id.exists' => 'Le circuit spécifié est introuvable dans la base de données.',
    ];
}

}
