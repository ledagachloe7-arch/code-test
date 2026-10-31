<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RoleHasPermission extends Model
{
    use HasUuids;

    protected $table = 'role_has_permissions';

    protected $fillable = [
        'role',
        'permission',
    ];

    protected function casts(): array
    {
        return [
            'permission' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
