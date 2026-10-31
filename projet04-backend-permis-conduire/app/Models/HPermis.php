<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class HPermis extends Model
{
    //

    use HasUuids;

    protected $fillable = [
        'numero_identite', 
        'nom', 
        'prenom', 
        'sexe', 
        'nationalite',
        'date_naissance', 
        'lieu_naissance',
        'numero_permis',
        'type_permis',
        'categorie',
        'date_obtention',
        'lieu_obtention',
        'date_validite',
        'numero_origine_permis',
        'lieu_origine',
        'date_renou1',
        'date_renou2',
        'date_renou3'
    ];
}
