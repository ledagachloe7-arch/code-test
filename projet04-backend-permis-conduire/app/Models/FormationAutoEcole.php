<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormationAutoEcole extends Model
{
    use HasUuids;

    protected $table = 'formation_auto_ecoles';

    protected $fillable = [
        'auto_ecole_id',
        'type_permis_id',
        'montant',
        'description',
        'session_id',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'decimal:2',
            'statut' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Une formation appartient à une auto-école
     */
    public function autoEcole(): BelongsTo
    {
        return $this->belongsTo(AutoEcole::class, 'auto_ecole_id');
    }

    /**
     * Relation : Une formation a un type de permis (référentiel)
     */
    public function typePermis(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'type_permis_id');
    }

    /**
     * Relation : Une formation a une session (référentiel)
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'session_id');
    }

    /**
     * Relation : Une formation concerne plusieurs dossiers
     */
    public function dossiers(): HasMany
    {
        return $this->hasMany(Dossier::class, 'formation_id');
    }
}
