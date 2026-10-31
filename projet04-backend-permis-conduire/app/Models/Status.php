<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Status extends Model
{
    use HasUuids;

    protected $table = 'status';

    protected $fillable = [
        'code',
        'libelle',
        'final',
        'annulable',
    ];

    protected function casts(): array
    {
        return [
            'final' => 'boolean',
            'annulable' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
