<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use App\Services\CaptchaService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Définir le rôle par défaut à ROLE_CANDIDAT si non fourni
        if (!$this->has('role') || empty($this->role)) {
            $this->merge([
                'role' => 'ROLE_CANDIDAT'
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $role = $this->input('role');
        $requiresCaptcha = empty($role) || $role === 'ROLE_CANDIDAT';

        $rules = [
            'email' => ['nullable', 'email', 'unique:utilisateurs,email', 'max:255'],
            'telephone' => ['required', 'string', 'unique:utilisateurs,telephone', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'contact' => ['required', 'string', 'max:20'],
            'adresse' => ['nullable', 'string', 'max:500'],
            'role' => ['nullable', 'string', 'max:100'],
            // UUID du centre (référentiel) auquel l'utilisateur est rattaché. Optionnel ; utilisé pour les agents (restriction par centre).
            'centre_id' => ['nullable', 'uuid', 'exists:referentiels,id'],
        ];

        // Ajouter les règles de captcha seulement si nécessaire
        if ($requiresCaptcha) {
            $rules['captcha_id'] = ['required', 'uuid'];
            $rules['captcha_code'] = ['required', 'string', 'max:10'];
        }

        return $rules;
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
            $role = $this->input('role');
            $requiresCaptcha = empty($role) || $role === 'ROLE_CANDIDAT';

            // Valider le captcha seulement si nécessaire
            if ($requiresCaptcha) {
                $captchaId = $this->input('captcha_id');
                $captchaCode = $this->input('captcha_code');

                if (!$validator->errors()->has('captcha_id') && !$validator->errors()->has('captcha_code')) {
                    $captchaService = app(CaptchaService::class);
                    if (!$captchaService->validateCaptcha($captchaId, $captchaCode)) {
                        $validator->errors()->add('captcha_code', 'Le code captcha est invalide ou a expiré.');
                    }
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
            'email.email' => 'L\'adresse email doit être valide.',
            'email.unique' => 'Cette adresse email est déjà utilisée.',
            'email.max' => 'L\'adresse email ne peut pas dépasser :max caractères.',
            
            'telephone.required' => 'Le numéro de téléphone est obligatoire.',
            'telephone.string' => 'Le numéro de téléphone doit être une chaîne de caractères.',
            'telephone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'telephone.max' => 'Le numéro de téléphone ne peut pas dépasser :max caractères.',
            
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.string' => 'Le mot de passe doit être une chaîne de caractères.',
            'password.min' => 'Le mot de passe doit contenir au moins :min caractères.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            
            'nom.required' => 'Le nom est obligatoire.',
            'nom.string' => 'Le nom doit être une chaîne de caractères.',
            'nom.max' => 'Le nom ne peut pas dépasser :max caractères.',
            
            'prenom.required' => 'Le prénom est obligatoire.',
            'prenom.string' => 'Le prénom doit être une chaîne de caractères.',
            'prenom.max' => 'Le prénom ne peut pas dépasser :max caractères.',
            
            'contact.required' => 'Le numéro de contact est obligatoire.',
            'contact.string' => 'Le numéro de contact doit être une chaîne de caractères.',
            'contact.max' => 'Le numéro de contact ne peut pas dépasser :max caractères.',
            
            'adresse.string' => 'L\'adresse doit être une chaîne de caractères.',
            'adresse.max' => 'L\'adresse ne peut pas dépasser :max caractères.',
            
            'role.string' => 'Le rôle doit être une chaîne de caractères.',
            'role.max' => 'Le rôle ne peut pas dépasser :max caractères.',

            'centre_id.uuid' => 'L\'identifiant du centre doit être un UUID valide.',
            'centre_id.exists' => 'Le centre sélectionné n\'existe pas.',

            'captcha_id.required' => 'Le captcha est obligatoire pour les candidats.',
            'captcha_id.uuid' => 'L\'identifiant du captcha est invalide.',

            'captcha_code.required' => 'Le code captcha est obligatoire pour les candidats.',
            'captcha_code.string' => 'Le code captcha doit être une chaîne de caractères.',
            'captcha_code.max' => 'Le code captcha ne peut pas dépasser :max caractères.',
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
            'telephone' => 'numéro de téléphone',
            'password' => 'mot de passe',
            'nom' => 'nom',
            'prenom' => 'prénom',
            'contact' => 'contact',
            'adresse' => 'adresse',
            'role' => 'rôle',
            'centre_id' => 'centre',
            'captcha_id' => 'identifiant du captcha',
            'captcha_code' => 'code captcha',
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
                'message' => 'Erreur de validation des données.',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
