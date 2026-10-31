<?php

namespace App\Http\Requests\Etape;

use App\Models\Etape;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEtapeRequest extends FormRequest
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
        $etapeId = $this->route('etape')->id;

        return [
            'circuit_id' => ['sometimes', 'uuid', 'exists:circuits,id'],
            'code' => ['nullable', 'sometimes', 'string', 'max:100', "unique:etapes,code,{$etapeId}"],
            'libelle' => ['sometimes', 'string', 'max:255'],

            'statut_id' => ['required', 'uuid', 'exists:statuts,id'],
            'pieces'=>['array','nullable'],
            'pieces.*.type_document' => ['required', 'uuid'],
            'pieces.*.libelle' => ['required'],
            'pieces.*.obligatoire' => ['required', 'boolean'],
            'roles'=>['array']
        ];
    }
}
