<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Commande du guichet usager : plusieurs actions, un seul paiement.
 */
class CommandeGuichet extends Model
{
    use HasUuids;

    public const STATUT_EN_ATTENTE = 'EN_ATTENTE_PAIEMENT';
    public const STATUT_CONFIRME = 'CONFIRME';
    public const STATUT_ECHOUE = 'ECHOUE';

    public const OPERATEUR_MOOV = 'MOOV';
    public const OPERATEUR_AIRTEL = 'AIRTEL';

    protected $table = 'commandes_guichet';

    public $incrementing = false;
    protected $keyType = 'string';

    /** Toutes les écritures passent par CommandeGuichetService. */
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'montant' => 'decimal:2',
            'date_confirmation_paiement' => 'datetime',
        ];
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(CommandeGuichetLigne::class, 'commande_guichet_id')->orderBy('created_at');
    }
}
