<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PieceJustificative extends Model
{
    use HasUuids;

    protected $table = 'pieces_justificatives';

    protected $fillable = [
        'type_document_id',
        'obligatoire',
        'etape_id',
        'libelle'
    ];

    protected function casts(): array
    {
        return [
            'obligatoire' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Type de document (référentiel)
     */
    public function typeDocument(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'type_document_id');
    }

    /**
     * Relation polymorphique : Une pièce justificative peut avoir plusieurs documents
     */
    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    /**
     * Remplir automatiquement libelle_piece_justificative avant la création
     */
    protected static function booted()
    {
        static::creating(function (PieceJustificative $piece) {
            if ($piece->type_document_id && empty($piece->libelle_piece_justificative)) {
                $referentiel = $piece->typeDocument; // relation BelongsTo
                if ($referentiel) {
                    $piece->libelle = $referentiel->libelle;
                }
            }
        });
    }
}
