<?php

namespace App\Http\Requests\Dossier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class TransfertDossierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'dossier_id' => ['nullable', 'uuid', 'exists:dossiers,id'],
            'type_demande_id' => ['nullable', 'uuid', 'exists:type_demandes,id'],
            'dossiers' => ['nullable', 'array', 'max:100'],
            'dossiers.*.dossier_id' => ['required_with:dossiers', 'uuid', 'exists:dossiers,id'],
            'dossiers.*.type_demande_id' => ['required_with:dossiers', 'uuid', 'exists:type_demandes,id'],
        ];

        $this->addConditionalRules($rules);

        return $rules;
    }

    /**
     * Si "dossiers" n'est pas fourni, dossier_id et type_demande_id sont obligatoires (envoi single).
     */
    protected function addConditionalRules(array &$rules): void
    {
        if (!$this->has('dossiers') || !is_array($this->input('dossiers')) || empty($this->input('dossiers'))) {
            $rules['dossier_id'] = ['required', 'uuid', 'exists:dossiers,id'];
            $rules['type_demande_id'] = ['required', 'uuid', 'exists:type_demandes,id'];
        }
    }

    /**
     * Retourne une liste normalisée : [ [ 'dossier_id' => ..., 'type_demande_id' => ... ], ... ].
     */
    public function getDossiersToTransfer(): array
    {
        if ($this->filled('dossiers') && is_array($this->dossiers) && count($this->dossiers) > 0) {
            return array_values($this->dossiers);
        }
        if ($this->filled('dossier_id') && $this->filled('type_demande_id')) {
            return [
                ['dossier_id' => $this->dossier_id, 'type_demande_id' => $this->type_demande_id],
            ];
        }
        return [];
    }

    public function messages(): array
    {
        return [
            'dossier_id.required' => 'Le dossier est obligatoire (ou utilisez "dossiers" pour un envoi en masse).',
            'dossier_id.uuid' => 'Le dossier doit être un identifiant valide.',
            'dossier_id.exists' => 'Le dossier est invalide ou n\'est pas répertorié.',

            'type_demande_id.required' => 'Le type de demande est obligatoire.',
            'type_demande_id.uuid' => 'Le type de demande doit être un identifiant valide.',
            'type_demande_id.exists' => 'Le type de demande est invalide ou n\'est pas répertorié.',

            'dossiers.max' => 'Maximum 100 dossiers par envoi en masse.',
            'dossiers.*.dossier_id.required_with' => 'Chaque élément de "dossiers" doit contenir "dossier_id".',
            'dossiers.*.dossier_id.exists' => 'Un des dossiers est invalide ou n\'est pas répertorié.',
            'dossiers.*.type_demande_id.required_with' => 'Chaque élément de "dossiers" doit contenir "type_demande_id".',
            'dossiers.*.type_demande_id.exists' => 'Un des types de demande est invalide.',
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
