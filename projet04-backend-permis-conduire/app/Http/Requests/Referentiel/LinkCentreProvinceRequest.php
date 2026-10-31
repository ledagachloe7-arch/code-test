<?php

namespace App\Http\Requests\Referentiel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class LinkCentreProvinceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'centre_id' => [
                'required',
                'uuid',
                Rule::exists('referentiels', 'id')->where('type_ref', 'centre'),
            ],
            'province_id' => [
                'required',
                'uuid',
                Rule::exists('referentiels', 'id')->where('type_ref', 'province'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'centre_id.required' => 'Le centre est obligatoire.',
            'centre_id.exists' => 'Le centre sélectionné n\'existe pas ou n\'est pas de type centre.',
            'province_id.required' => 'La province est obligatoire.',
            'province_id.exists' => 'La province sélectionnée n\'existe pas ou n\'est pas de type province.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Les données fournies ne sont pas valides.',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
