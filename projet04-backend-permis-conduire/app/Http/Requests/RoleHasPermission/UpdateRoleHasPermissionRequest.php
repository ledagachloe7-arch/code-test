<?php

namespace App\Http\Requests\RoleHasPermission;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateRoleHasPermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('role_has_permission')->id;

        return [
            'role' => ['sometimes', 'string', 'max:255', 'unique:role_has_permissions,role,' . $id],
            'permission' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'role.unique' => 'Ce rôle existe déjà.',
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
