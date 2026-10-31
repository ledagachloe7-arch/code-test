<?php

namespace App\Http\Requests\AutoEcole;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class UpdateAutoEcoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $autoEcoleId = $this->route('auto_ecole');

        return [
            'nom_auto_ecole' => ['sometimes', 'string', 'max:255'],
            'adresse' => ['nullable', 'string'],
            'email' => ['sometimes', 'email', Rule::unique('auto_ecoles', 'email')->ignore($autoEcoleId)],
            'responsable_id' => ['sometimes', 'uuid', 'exists:personnes,id'],
            'contact' => ['sometimes', 'string', 'max:20'],
            'statut' => ['sometimes', 'boolean'],
            'province_id' => [
                'required',
                'uuid',
                Rule::exists('referentiels', 'id')->where('type_ref', 'province'),
            ]
        ];
    }

    public function messages(): array
    {
        return [
            'email.email' => 'L\'email doit être une adresse email valide.',
            'email.unique' => 'Cet email est déjà utilisé par une autre auto-école.',
            'responsable_id.exists' => 'Ce responsable n\'existe pas.',
            'province_id.required' => 'La province est obligatoire.',
            'province_id.uuid' => 'La province doit être un identifiant valide.',
            'province_id.exists' => 'La province sélectionnée est invalide ou n\'est pas répertoriée dans les provinces.',
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

