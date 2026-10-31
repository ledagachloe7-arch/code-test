<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgrammeSession extends Model
{
    use HasUuids;

    protected $table = 'programme_sessions';

    protected $fillable = [
        'dossier_id',
        'date_examen',
    ];

    protected function casts(): array
    {
        return [
            'date_examen' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Un programme session appartient à un dossier
     */
    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class, 'dossier_id');
    }
}
