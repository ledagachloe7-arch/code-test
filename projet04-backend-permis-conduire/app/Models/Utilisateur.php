<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Utilisateur extends Authenticatable
{
    use HasApiTokens, HasUuids, Notifiable;

    protected $table = 'utilisateurs';

    protected $fillable = [
        'email',
        'telephone',
        'password',
        'role',
        'centre_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Les valeurs par défaut pour les attributs
     */
    protected $attributes = [
        'role' => 'ROLE_CANDIDAT',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'verified_at' => 'datetime',
            'password' => 'hashed',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Un utilisateur a une personne
     */
    public function personne(): HasOne
    {
        return $this->hasOne(Personne::class, 'utilisateur_id');
    }

    /**
     * Relation : Un agent peut appartenir à un seul centre (référentiel).
     */
    public function centre(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'centre_id');
    }

    /**
     * Vérifie si l'utilisateur est un agent (non candidat) rattaché à un centre.
     * Ces agents ne peuvent voir et traiter que les dossiers de leur centre.
     */
    public function isAgentWithCentre(): bool
    {
        return $this->role !== 'ROLE_CANDIDAT' && $this->centre_id !== null;
    }

    /**
     * Administrateurs : pas de restriction par centre sur les dossiers (listes et accès unitaire).
     * Aligné avec les rôles existants (admin en base, ROLE_ADMIN, super-admin éventuels).
     */
    public function bypassesDossierCentreScope(): bool
    {
        $r = strtolower((string) ($this->role ?? ''));

        return in_array($r, [
            'admin',
            'role_admin',
            'role_super_admin',
            'super_admin',
            'superadmin',
        ], true);
    }

    /**
     * Relation : Un utilisateur peut avoir plusieurs souscriptions push
     */
    public function pushSubscriptions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PushSubscription::class, 'utilisateur_id');
    }
}
