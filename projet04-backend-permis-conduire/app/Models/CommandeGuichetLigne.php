<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Une action payée dans une commande du guichet (renouvellement, digitalisation ou mise à jour).
 */
class CommandeGuichetLigne extends Model
{
    use HasUuids;

    public const TYPE_RENOUVELLEMENT = 'RENOUVELLEMENT';
    public const TYPE_DIGITALISATION = 'DIGITALISATION';
    public const TYPE_MISE_A_JOUR = 'MISE_A_JOUR';
    /** Payé AVANT la création de la demande : objet_id = jeton provisoire, remplacé par l'id du duplicata à sa création (« consommé »). */
    public const TYPE_DUPLICATA = 'DUPLICATA';
    public const TYPES = [self::TYPE_RENOUVELLEMENT, self::TYPE_DIGITALISATION, self::TYPE_MISE_A_JOUR, self::TYPE_DUPLICATA];

    public const STATUT_EN_ATTENTE = 'EN_ATTENTE_PAIEMENT';
    public const STATUT_PAYE = 'PAYE';
    public const STATUT_ECHOUE = 'ECHOUE';

    protected $table = 'commande_guichet_lignes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['montant' => 'decimal:2'];
    }
}
