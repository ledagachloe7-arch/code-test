<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResetPasswordRequest extends FormRequest
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
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::exists('utilisateurs', 'email'),
            ],
            'code' => [
                'required',
                'string',
                'size:6',
                'regex:/^[0-9]{6}$/',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:255',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
            ],
            'password_confirmation' => [
                'required',
                'string',
                'same:password',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'L\'adresse email est obligatoire.',
            'email.email' => 'L\'adresse email doit être valide.',
            'email.max' => 'L\'adresse email ne peut pas dépasser 255 caractères.',
            'email.exists' => 'Cette adresse email n\'existe pas dans notre système.',
            
            'code.required' => 'Le code de réinitialisation est obligatoire.',
            'code.string' => 'Le code de réinitialisation doit être une chaîne de caractères.',
            'code.size' => 'Le code de réinitialisation doit contenir exactement 6 chiffres.',
            'code.regex' => 'Le code de réinitialisation doit contenir uniquement des chiffres.',
            
            'password.required' => 'Le nouveau mot de passe est obligatoire.',
            'password.string' => 'Le nouveau mot de passe doit être une chaîne de caractères.',
            'password.min' => 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
            'password.max' => 'Le nouveau mot de passe ne peut pas dépasser 255 caractères.',
            'password.regex' => 'Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial.',
            
            'password_confirmation.required' => 'La confirmation du mot de passe est obligatoire.',
            'password_confirmation.string' => 'La confirmation du mot de passe doit être une chaîne de caractères.',
            'password_confirmation.same' => 'La confirmation du mot de passe ne correspond pas au mot de passe.',
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
            'email' => 'adresse email',
            'code' => 'code de réinitialisation',
            'password' => 'nouveau mot de passe',
            'password_confirmation' => 'confirmation du mot de passe',
        ];
    }
}