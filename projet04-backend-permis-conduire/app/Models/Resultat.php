<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Resultat extends Model
{
    use HasUuids;

    protected $table = 'resultats';

    protected $fillable=[
        'dossier_id',
        'typeExamen',
        'statut',
        'date',
        'commentaire'
    ];

    protected $casts = [
        'date'=> 'datetime'
    ];

    public function dossier():BelongsTo{
        return $this->belongsTo(Dossier::class, 'dossier_id');
    }
}
