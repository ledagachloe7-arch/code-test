<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Circuit extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'circuits';
    protected $fillable = [
        'libelle',
        'actif',
        'nom_entite',
        'nationalite', //string
        'type_permis' //string
    ];
    protected $casts = [
        'actif' => 'boolean',
    ];

    // Relations
    public function etapes():HasMany
    {
        return $this->hasMany(Etape::class);
    }

    // Relations
    public function transitions():HasMany
    {
        return $this->hasMany(Transition::class);
    }

    public function journauxTransitions():HasMany
    {
        return $this->hasMany(JournalTransition::class);
    }
}