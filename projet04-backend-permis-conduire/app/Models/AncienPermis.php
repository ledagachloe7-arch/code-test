<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Ligne du registre Excel des anciens permis roses (avant informatisation).
 */
class AncienPermis extends Model
{
    use HasUuids;

    public const STATUT_A_INFORMATISER = 'A_INFORMATISER';
    public const STATUT_INFORMATISE = 'INFORMATISE';
    public const STATUT_ANOMALIE = 'ANOMALIE';

    protected $table = 'anciens_permis';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected $hidden = ['donnees_brutes'];

    protected function casts(): array
    {
        return [
            'donnees_brutes' => 'array',
            'nouveaux_numeros' => 'array',
            'date_naissance' => 'date:Y-m-d',
            'date_obtention' => 'date:Y-m-d',
            'date_validite' => 'date:Y-m-d',
            'informatise_le' => 'datetime',
        ];
    }
}
