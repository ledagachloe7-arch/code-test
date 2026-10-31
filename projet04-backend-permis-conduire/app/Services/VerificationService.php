<?php

namespace App\Services;

use App\Mail\VerificationCodeMail;
use App\Models\Utilisateur;
use App\Models\VerificationCode;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Services\AirtelSmsService;

class VerificationService
{
    /**
     * Générer un code de vérification à 8 chiffres
     */
    public function generateVerificationCode(): string
    {
        return str_pad((string) random_int(10000000, 99999999), 8, '0', STR_PAD_LEFT);
    }

    /**
     * Envoyer un code de vérification par email
     */
    public function sendVerificationCodeByEmail(Utilisateur $user, string $code): bool
    {
        try {
            if (empty($user->email)) {
                Log::warning('Tentative d\'envoi de code de vérification par email sans email', [
                    'user_id' => $user->id
                ]);
                return false;
            }

            $this->storeCode($user, 'email', $code);

            // Envoyer l'email avec le template
            $expiresInMinutes = (int) config('services.verification_code_ttl', 15);
            Mail::to($user->email)->queue(
                new VerificationCodeMail($code, $user, $expiresInMinutes)
            );

            Log::info('Code de vérification envoyé par email', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Erreur envoi code de vérification par email', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Envoyer un code de vérification par SMS
     * TODO: Implémenter quand l'API SMS sera disponible
     */
    public function sendVerificationCodeBySms(Utilisateur $user, string $code): bool
    {
        try {
            if (empty($user->telephone)) {
                Log::warning('Tentative d\'envoi de code de vérification par SMS sans téléphone', [
                    'user_id' => $user->id
                ]);
                return false;
            }

            // Récupérer le service SMS
            $smsServices = new AirtelSmsService();
            // $smsEnabled = (bool) config('services.sms.enabled', false);

            // Stocker le code
            $this->storeCode($user, 'sms', $code);

            /*
            if (!$smsEnabled) {
                Log::info('Code de vérification SMS généré mais SMS désactivé', [
                    'user_id' => $user->id,
                    'telephone' => $user->telephone,
                    'code' => $code,
                    'sms_enabled' => false,
                ]);

                return false;
            }
            */

            // Envoyer le SMS via Airtel
            $message = "Code de verification DGTT : {$code}. Ce code expire dans 15 minutes.";
            
            $sent = $smsServices->send($user->telephone, $message);

            if ($sent) {
                Log::info('✅ Code de vérification envoyé par SMS', [
                    'user_id' => $user->id,
                    'telephone' => $user->telephone
                ]);
                return true;
            } else {
                Log::error('❌ Échec envoi code vérification SMS', [
                    'user_id' => $user->id
                ]);
                return false;
            }

        } catch (\Exception $e) {
            Log::error('Erreur envoi code de vérification par SMS', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Vérifier le code de vérification
     */
    public function verifyCode(Utilisateur $user, string $code, string $method = 'email'): bool
    {
        $record = VerificationCode::where('utilisateur_id', $user->id)
            ->where('method', $method)
            ->first();

        if (!$record) {
            Log::warning('Code de vérification non trouvé', [
                'user_id' => $user->id,
                'method' => $method
            ]);
            return false;
        }

        if (Carbon::now()->greaterThan($record->expires_at)) {
            Log::warning('Code de vérification expiré', [
                'user_id' => $user->id,
                'method' => $method
            ]);
            $record->delete();
            return false;
        }

        $isValid = hash_equals($record->code_hash, $this->hashCode($code));

        if ($isValid) {
            VerificationCode::where('utilisateur_id', $user->id)->delete();
            $user->verified_at = now();
            $user->save();

            Log::info('Compte vérifié avec succès', [
                'user_id' => $user->id,
                'method' => $method
            ]);
        }

        return $isValid;
    }

    /**
     * Vérifier si un utilisateur a un compte vérifié
     */
    public function isVerified(Utilisateur $user): bool
    {
        return $user->verified_at !== null;
    }

    private function storeCode(Utilisateur $user, string $method, string $code): void
    {
        $expiresAt = Carbon::now()->addMinutes((int) config('services.verification_code_ttl', 15));

        VerificationCode::updateOrCreate(
            [
                'utilisateur_id' => $user->id,
                'method' => $method
            ],
            [
                'code_hash' => $this->hashCode($code),
                'expires_at' => $expiresAt
            ]
        );
    }

    /**
     * Hasher le code pour le stockage
     */
    private function hashCode(string $code): string
    {
        return hash('sha256', $code);
    }
}

