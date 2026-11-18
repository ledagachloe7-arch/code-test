<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Demande de duplicata du permis rose : lien durable entre le nouveau dossier et le permis source.
 */
class DuplicataDemande extends Model
{
    use HasUuids;

    protected $table = 'duplicata_demandes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected $hidden = ['justificatif_path'];

    public function dossier()
    {
        return $this->belongsTo(Dossier::class, 'dossier_id');
    }

    public function permisSource()
    {
        return $this->belongsTo(HPermis::class, 'permis_source_id');
    }
}
