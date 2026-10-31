<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SocketMessage extends Model
{

    use HasFactory,HasUuids;

    protected $table = 'socket_messages';
    protected $fillable = [
        'message',
        'role',
    ];

    /**
     * Colonne PostgreSQL json : doit recevoir un tableau encodable en JSON valide (pas une chaîne brute).
     */
    protected function casts(): array
    {
        return [
            'message' => 'array',
        ];
    }
}
