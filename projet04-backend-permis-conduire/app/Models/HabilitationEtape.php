<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HabilitationEtape extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'habilitations_etapes';
    protected $fillable = [
        'etape_id',
        'role_code',
        'peut_lire',
        'peut_valider',
        'peut_rejeter',
        'peut_modifier_pieces',
    ];
    protected $casts = [
        'peut_lire' => 'boolean',
        'peut_valider' => 'boolean',
        'peut_rejeter' => 'boolean',
        'peut_modifier_pieces' => 'boolean',
    ];

    public function etape():BelongsTo
    {
        return $this->belongsTo(Etape::class);
    }

    public function role():BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_code', 'code');
    }
}
