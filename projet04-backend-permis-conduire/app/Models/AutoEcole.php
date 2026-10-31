<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AutoEcole extends Model
{
    use HasUuids;

    protected $table = 'auto_ecoles';

    protected $fillable = [
        'nom_auto_ecole',
        'adresse',
        'email',
        'responsable_id',
        'contact',
        'statut',
        'province_id'
    ];

    protected function casts(): array
    {
        return [
            'statut' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Une auto-école appartient à un responsable (Personne)
     */
    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personne::class, 'responsable_id');
    }

    /**
     * Relation : Une auto-école propose plusieurs formations
     */
    public function formations(): HasMany
    {
        return $this->hasMany(FormationAutoEcole::class, 'auto_ecole_id');
    }

    /**
     * Relation : Une auto-école gère plusieurs dossiers
     */
    public function dossiers(): HasMany
    {
        return $this->hasMany(Dossier::class, 'auto_ecole_id');
    }

    /**  
     * Relation : province à laquelle appartient l'auto-école
     */
    public function province():BelongsTo{
        return $this->belongsTo(Referentiel::class, 'province_id', 'id');
    }
}
