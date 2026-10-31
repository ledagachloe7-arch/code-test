<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class Paiement extends Model
{
    use HasUuids;

    protected $table = 'paiements';

    public $incrementing = false;  // important pour UUID
    protected $keyType = 'string';

    protected $fillable = [
        'dossier_id',
        'code_paiement',
        'reference_paiement',
        'montant',
        'nom',
        'prenom',
    ];

    /**
     * Relation : Un paiment est lié à un dossier
     */
    public function dossier()
    {
        return $this->belongsTo(Dossier::class, 'dossier_id');
    }
}
