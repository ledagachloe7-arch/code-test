<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class LoginRequest extends FormRequest
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
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:6'],
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $identifier = $this->input('identifier');
            
            if ($identifier) {
                // VÃ©rifier si c'est un email valide ou un numÃ©ro de tÃ©lÃ©phone
                $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL) !== false;
                $isPhone = preg_match('/^[0-9+\-\s()]+$/', $identifier) && strlen($identifier) >= 8;
                
                if (!$isEmail && !$isPhone) {
                    $validator->errors()->add('identifier', 'L\'identifiant doit Ãªtre soit un email valide, soit un numÃ©ro de tÃ©lÃ©phone.');
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'identifier.required' => 'L\'identifiant (email ou numÃ©ro de tÃ©lÃ©phone) est obligatoire.',
            'identifier.string' => 'L\'identifiant doit Ãªtre une chaÃ®ne de caractÃ¨res.',
            'identifier.max' => 'L\'identifiant ne peut pas dÃ©passer :max caractÃ¨res.',
            
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.string' => 'Le mot de passe doit Ãªtre une chaÃ®ne de caractÃ¨res.',
            'password.min' => 'Le mot de passe doit contenir au moins :min caractÃ¨res.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'identifier' => 'identifiant',
            'password' => 'mot de passe',
        ];
    }

    /**
     * Handle a failed validation attempt.
     *
     * @param  \Illuminate\Contracts\Validation\Validator  $validator
     * @return void
     *
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Erreur de validation des donnÃ©es.',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}

