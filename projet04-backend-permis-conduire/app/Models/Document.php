<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Document extends Model
{
    use HasUuids;

    protected $table = 'documents';

    protected $fillable = [
        'documentable_id',
        'documentable_type',
        'type_document_id',
        'nom_fichier',
        'chemin_fichier',
        'type_mime',
        'taille_fichier',
        'valide',
        'commentaires',
        'piece_justification_id',
        'node_id_alfresco',
    ];

    protected function casts(): array
    {
        return [
            'valide' => 'boolean',
            'taille_fichier' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation polymorphique : Un document peut appartenir à n'importe quel modèle
     */
    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Relation : Un document a un type (référentiel)
     */
    public function typeDocument(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'type_document_id');
    }

      /**
     * Relation : Un document a un type (référentiel)
     */
    public function pieceJustificatif(): BelongsTo
    {
        return $this->belongsTo(PieceJustificative::class, 'piece_justification_id');
    }
}
