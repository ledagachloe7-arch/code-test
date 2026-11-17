<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Détail d'un renouvellement pour une catégorie (une ligne h_permis).
 */
class RenouvellementCategorie extends Model
{
    use HasUuids;

    protected $table = 'renouvellement_categories';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'ancienne_date_expiration' => 'date:Y-m-d',
            'nouvelle_date_delivrance' => 'date:Y-m-d',
            'nouvelle_date_expiration' => 'date:Y-m-d',
        ];
    }

    public function renouvellement()
    {
        return $this->belongsTo(Renouvellement::class, 'renouvellement_id');
    }

    public function permis()
    {
        return $this->belongsTo(HPermis::class, 'h_permis_id');
    }
}
