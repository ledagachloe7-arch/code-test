<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transition extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'transitions';
    protected $fillable = [
        'code',
        'libelle',   // JSON
        'source_etape_id',
        'cible_etape_id',
        'circuit_id',
    ];
    protected $casts = [
    ];

    // Relations
    public function source():BelongsTo
    {
        return $this->belongsTo(Etape::class, 'source_etape_id');
    }

    public function cible():BelongsTo
    {
        return $this->belongsTo(Etape::class, 'cible_etape_id');
    }

    public function journaux():HasMany
    {
        return $this->hasMany(JournalTransition::class);
    }

    public function circuit():BelongsTo{
        return $this->belongsTo(Circuit::class,'circuit_id');
    }

    /**
     * Vérifie avant création ou mise à jour :
     * - que la source et la cible appartiennent au même circuit.
     */
    protected static function booted()
    {
        static::saving(function ($transition) {
            // Charger les étapes
            $source = Etape::find($transition->source_etape_id);
            $cible  = Etape::find($transition->cible_etape_id);

            // Vérifier qu’elles existent
            if (!$source || !$cible) {
                throw new \Exception("Les étapes source et/ou cible sont introuvables.");
            }

            // Vérifier qu’elles appartiennent au même circuit
            if ($source->circuit_id !== $cible->circuit_id) {
                throw new \Exception("Les étapes source et cible doivent appartenir au même circuit.");
            }
        });
    }
}
