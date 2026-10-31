<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class TypeDemande extends Model
{
    use HasUuids;

    protected $table = 'type_demandes';

    protected $fillable = [
        'name',
    ];
}
