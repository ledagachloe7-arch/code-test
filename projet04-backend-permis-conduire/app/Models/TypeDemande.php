<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class TypeDemande extends Model
{
    use HasUuids;

    protected $table = 'type_demandes';

    /** Types retirés : plus de création de dossier ; les dossiers existants restent consultables. */
    public const TYPES_RETIRES = ['RENOUVELLEMENT', 'MISEAJOUR', 'CONVERSION'];

    protected $fillable = [
        'name',
    ];
}
