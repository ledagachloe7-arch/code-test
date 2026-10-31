<?php

namespace App\Models;

use App\Models\Transition;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Etape extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'etapes';
    protected $fillable = [
        'circuit_id',
        'code',
        'libelle',
        'statut_libelle',
        'roles',
        'statut_id',
        'pieces'
    ];
    protected $casts = [
        'roles' => 'array',
        'pieces' => 'array',
    ];

    // Relations
    public function circuit():BelongsTo
    {
        return $this->belongsTo(Circuit::class);
    }

    public function statut():BelongsTo
    {
        return $this->belongsTo(Statut::class, 'statut_id');
    }

    // Transitions avec cette étape comme source
    public function transitionSortante():HasMany
    {
        return $this->hasMany(Transition::class, 'source_etape_id');
    }

    // Transitions vers cette étape comme cible
    public function transitionEntrante():HasMany
    {
        return $this->hasMany(Transition::class, 'cible_etape_id');
    }

    public function pieces():HasMany
    {
        return $this->hasMany(PieceJustificative::class);
    }

    /* 
    *   Récupère le libelle du Statut correspondant,
    *   et met à jour automatiquement statut_libelle avant l’enregistrement 
    */
    protected static function booted()
    {
        static::saving(function ($etape) {
            if ($etape->statut_id) {
                $statut = Statut::find($etape->statut_id);
                $etape->statut_libelle = $statut?->libelle; // null-safe
            }
        });
    }

}
