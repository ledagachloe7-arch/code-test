<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Un renouvellement = un titulaire + un paiement, couvrant une ou plusieurs catégories.
 */
class Renouvellement extends Model
{
    use HasUuids;

    public const STATUT_EN_ATTENTE = 'EN_ATTENTE_PAIEMENT';
    public const STATUT_CONFIRME = 'CONFIRME';
    public const STATUT_ECHOUE = 'ECHOUE';
    public const STATUT_ANNULE = 'ANNULE';

    public const OPERATEUR_MOOV = 'MOOV';
    public const OPERATEUR_AIRTEL = 'AIRTEL';

    protected $table = 'renouvellements';

    public $incrementing = false;
    protected $keyType = 'string';

    /**
     * Aucune affectation de masse : toutes les écritures passent par RenouvellementService
     * (dates générées par le serveur, jamais par l'agent).
     */
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'montant' => 'decimal:2',
            'date_naissance' => 'date:Y-m-d',
            'nouvelle_date_delivrance' => 'date:Y-m-d',
            'date_confirmation_paiement' => 'datetime',
        ];
    }

    public function categories()
    {
        return $this->hasMany(RenouvellementCategorie::class, 'renouvellement_id')->orderBy('categorie');
    }
}
