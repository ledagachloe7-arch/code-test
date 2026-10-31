<?php

namespace App\Http\Requests\AutoEcole;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StoreAutoEcoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom_auto_ecole' => ['required', 'string', 'max:255'],
            'adresse' => ['nullable', 'string'],
            'email' => ['required', 'email', 'unique:auto_ecoles,email'],
            'responsable_id' => ['required', 'uuid', 'exists:personnes,id'],
            'contact' => ['required', 'string', 'max:20'],
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
            'nom_auto_ecole.required' => 'Le nom de l\'auto-école est obligatoire.',
            'email.required' => 'L\'email est obligatoire.',
            'email.email' => 'L\'email doit être une adresse email valide.',
            'email.unique' => 'Cet email est déjà utilisé par une autre auto-école.',
            'responsable_id.required' => 'Le responsable est obligatoire.',
            'responsable_id.exists' => 'Ce responsable n\'existe pas.',
            'contact.required' => 'Le contact est obligatoire.',
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

