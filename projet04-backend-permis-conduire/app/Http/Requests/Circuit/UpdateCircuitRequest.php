<?php

namespace App\Http\Requests\Circuit;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCircuitRequest extends FormRequest
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
        $circuitId = $this->route('circuit')?->id;

        return [
            'nom' => 'sometimes|string|max:255|unique:circuits,nom,' . $circuitId,
            'actif' => 'sometimes|boolean',
            'nom_entite' => 'sometimes|string|max:255',
            'nationalite'=> 'nullable|string|max:255',
            'type_permis'=> 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'nom.unique' => 'Un autre circuit utilise déjà ce nom.',
        ];
    }
}
