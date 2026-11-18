<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Shortcode (cashier_short_code) renvoyé par la CNEDDT lors d'un transfert de dossier.
 */
class CneddtShortcode extends Model
{
    use HasUuids;

    public const STATUT_ACTIF = 'ACTIF';

    protected $table = 'cneddt_shortcodes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'date_naissance' => 'date:Y-m-d',
            'donnees_cneddt' => 'array',
        ];
    }
}
