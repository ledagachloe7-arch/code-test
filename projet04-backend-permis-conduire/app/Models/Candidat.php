<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Candidat extends Model
{
    use HasUuids;

    protected $table = 'candidats';

    protected $fillable = [
        'personne_id',
        'numero_candidat',
        'date_naissance',
        'lieu_naissance',
        'nip',
        'type_piece',
        'numero_piece',
        'nationalite',
        'genre',
    ];

    protected function casts(): array
    {
        return [
            'date_naissance' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Un candidat appartient à une personne
     */
    public function personne(): BelongsTo
    {
        return $this->belongsTo(Personne::class, 'personne_id');
    }

    /**
     * Relation : Un candidat peut avoir plusieurs dossiers
     */
    public function dossiers(): HasMany
    {
        return $this->hasMany(Dossier::class, 'candidat_id');
    }

    /**
     * Relation polymorphique : Un candidat peut avoir plusieurs documents
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * le scope pour filtrer les candidats par personne_id
     */
    public function scopeByPersonne($query, $personneId)
{
    // On n'applique le filtre que si une valeur est fournie
    return $query->when($personneId, function ($q) use ($personneId) {
        return $q->where('personne_id', $personneId);
    });
}
}
