<?php

namespace App\Http\Requests\Moov;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class VerifierCommandeRengusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('OrderID') && ! $this->filled('order_id')) {
            $this->merge(['order_id' => $this->input('OrderID')]);
        }
        if ($this->filled('reference_paiement') && ! $this->filled('order_id')) {
            $this->merge(['order_id' => $this->input('reference_paiement')]);
        }
    }

    public function rules(): array
    {
        return [
            'order_id' => ['required', 'string', 'max:128'],
            'code_paiement' => ['required', 'string', 'max:255'],
            'OrderID' => ['sometimes', 'string', 'max:128'],
            'reference_paiement' => ['sometimes', 'string', 'max:128'],
        ];
    }

    public function messages(): array
    {
        return [
            'order_id.required' => 'Le champ order_id (OrderID Moov / Rengus) est obligatoire (ou reference_paiement / OrderID).',
            'code_paiement.required' => 'Le code de paiement du dossier est obligatoire.',
        ];
    }

    protected function failedValidation(Validator $validator): void
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
