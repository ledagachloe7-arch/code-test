<?php

namespace App\Http\Requests\Circuit;

use Illuminate\Foundation\Http\FormRequest;

class StoreCircuitRequest extends FormRequest
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
            'libelle' => 'required|string|max:255|unique:circuits,libelle',
            'actif' => 'nullable|boolean',
            'nom_entite' => 'required|string|max:255',
            'nationalite'=> 'nullable|string|max:255',
            'type_permis'=> 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'libelle.required' => 'Le nom du circuit est obligatoire.',
            'nom.unique' => 'Ce nom de circuit existe déjà.',
            'nom_entite.required' => 'Le nom de l’entité est obligatoire.',
        ];
    }
}
