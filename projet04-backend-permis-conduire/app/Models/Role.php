<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $table = 'roles';

    /**
     * Clé primaire de la table roles.
     */
    protected $primaryKey = 'code';

    /**
     * La clé primaire est une chaîne et non un entier auto-incrémenté.
     */
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * Champs autorisés lors de la création et de la modification.
     */
    protected $fillable = [
        'code',
        'libelle',
    ];

    /**
     * Habilitations associées au rôle.
     */
    public function habilitations(): HasMany
    {
        return $this->hasMany(
            HabilitationEtape::class,
            'role_code',
            'code'
        );
    }
}
