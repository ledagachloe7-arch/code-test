<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Personne extends Model
{
    use HasUuids;

    protected $table = 'personnes';

    protected $fillable = [
        'utilisateur_id',
        'nom',
        'prenom',
        'email',
        'adresse',
        'contact',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Une personne appartient à un utilisateur
     */
    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    /**
     * Relation : Une personne peut être un administrateur
     */
    public function administrateur(): HasOne
    {
        return $this->hasOne(Administrateur::class, 'personne_id');
    }

    /**
     * Relation : Une personne peut être un candidat
     */
    public function candidat(): HasOne
    {
        return $this->hasOne(Candidat::class, 'personne_id');
    }

    /**
     * Relation : Une personne peut être responsable de plusieurs auto-écoles
     */
    public function autoEcoles(): HasMany
    {
        return $this->hasMany(AutoEcole::class, 'responsable_id');
    }
}
