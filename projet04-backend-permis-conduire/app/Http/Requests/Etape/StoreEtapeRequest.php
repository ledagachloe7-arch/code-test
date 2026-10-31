<?php

namespace App\Http\Requests\Etape;

use App\Models\Etape;
use Illuminate\Foundation\Http\FormRequest;

class StoreEtapeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }
    
    public function rules(): array
    {
        return [
            'circuit_id' => ['required', 'uuid', 'exists:circuits,id'],
            'code' => ['nullable', 'string', 'max:100', 'unique:etapes,code'],
            'libelle' => ['required', 'string', 'max:255'],
            // Statut lié
            'statut_id' => ['required', 'uuid', 'exists:statuts,id'],
            'pieces'=>['array','nullable'],
            'pieces.*.type_document' => ['required', 'uuid'],
            'pieces.*.libelle' => ['required'],
            'pieces.*.obligatoire' => ['required', 'boolean'],
            'roles'=>['array']
        ];
    }

    public function messages(): array
    {
        return [
            'circuit_id.exists' => 'Le circuit spécifié n’existe pas.',
            'statut_id.exists' => 'Le statut spécifié est invalide.',
        ];
    }
}
