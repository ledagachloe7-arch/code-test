<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Un champ corrigé dans une demande de modification (ancienne → nouvelle valeur).
 */
class ModificationDemandeLigne extends Model
{
    use HasUuids;

    protected $table = 'modification_demande_lignes';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = ['*'];

    protected $appends = ['champ_libelle'];

    protected function casts(): array
    {
        return ['details' => 'array'];
    }

    public function getChampLibelleAttribute(): string
    {
        return config('modifications.champs')[$this->champ] ?? $this->champ;
    }

    public function demande()
    {
        return $this->belongsTo(ModificationDemande::class, 'demande_id');
    }
}
