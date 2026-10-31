<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class PasswordReset extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'email',
        'code',
        'expires_at',
        'used',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used' => 'boolean',
    ];

    /**
     * Générer un code de réinitialisation de 6 chiffres
     *
     * @return string
     */
    public static function generateCode(): string
    {
        return str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Créer une demande de réinitialisation
     *
     * @param string $email
     * @return self
     */
    public static function createReset(string $email): self
    {
        // Supprimer les anciennes demandes pour cet email
        self::where('email', $email)->delete();

        return self::create([
            'email' => $email,
            'code' => self::generateCode(),
            'expires_at' => Carbon::now()->addMinutes(15), // Expire dans 15 minutes
            'used' => false,
        ]);
    }

    /**
     * Vérifier si le code est valide
     *
     * @param string $email
     * @param string $code
     * @return bool
     */
    public static function isValidCode(string $email, string $code): bool
    {
        $reset = self::where('email', $email)
            ->where('code', $code)
            ->where('used', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        return $reset !== null;
    }

    /**
     * Marquer le code comme utilisé
     *
     * @param string $email
     * @param string $code
     * @return bool
     */
    public static function markAsUsed(string $email, string $code): bool
    {
        $reset = self::where('email', $email)
            ->where('code', $code)
            ->where('used', false)
            ->first();

        if ($reset) {
            $reset->update(['used' => true]);
            return true;
        }

        return false;
    }

    /**
     * Nettoyer les codes expirés
     *
     * @return int Nombre de codes supprimés
     */
    public static function cleanupExpired(): int
    {
        return self::where('expires_at', '<', Carbon::now())->delete();
    }

    /**
     * Scope pour les codes valides
     */
    public function scopeValid($query)
    {
        return $query->where('used', false)
                    ->where('expires_at', '>', Carbon::now());
    }

    /**
     * Scope pour un email spécifique
     */
    public function scopeForEmail($query, string $email)
    {
        return $query->where('email', $email);
    }
}