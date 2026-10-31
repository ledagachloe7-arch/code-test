<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class ChangePermis extends Model
{
    //

    use HasUuids;
    protected $fillable = [
        'numero_permis',
        'numero_identite',
        'nom',
        'prenom',
    ];
}
