<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Administrateur extends Model
{
    use HasUuids;

    protected $table = 'administrateurs';

    protected $fillable = [
        'personne_id',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Relation : Un administrateur appartient à une personne
     */
    public function personne(): BelongsTo
    {
        return $this->belongsTo(Personne::class, 'personne_id');
    }
}
