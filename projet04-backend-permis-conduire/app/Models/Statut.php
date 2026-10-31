<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Statut extends Model
{
    use HasFactory,HasUuids;

    protected $table = 'statuts';

    protected $fillable = [
        'code',
        'libelle',
        'final',
        'annulable'
    ];
    protected $casts = [
        'final' => 'boolean',
        'annulable' => 'boolean'
    ];

    public function etapes():HasMany
    {
        return $this->hasMany(Etape::class);
    }
}
