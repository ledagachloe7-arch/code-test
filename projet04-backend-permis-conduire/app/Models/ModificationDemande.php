<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Demande de modification des informations personnelles d'un titulaire.
 * Peut corriger plusieurs champs (lignes) avec un motif et un justificatif communs.
 * Sert aussi d'historique : jamais supprimée une fois soumise.
 */
class ModificationDemande extends Model
{
    use HasUuids;

    public const STATUT_BROUILLON = 'BROUILLON';
    public const STATUT_SOUMISE = 'SOUMISE';
    public const STATUT_APPROUVEE = 'APPROUVEE';
    public const STATUT_REJETEE = 'REJETEE';

    protected $table = 'modification_demandes';

    public $incrementing = false;
    protected $keyType = 'string';

    /** Toutes les écritures passent par ModificationDemandeService. */
    protected $guarded = ['*'];

    /** Le chemin du fichier n'est jamais exposé : téléchargement via l'API uniquement. */
    protected $hidden = ['justificatif_path'];

    protected $appends = ['a_justificatif'];

    protected function casts(): array
    {
        return [
            'date_soumission' => 'datetime',
            'date_decision' => 'datetime',
            'date_application' => 'datetime',
        ];
    }

    public function lignes()
    {
        return $this->hasMany(ModificationDemandeLigne::class, 'demande_id')->orderBy('created_at');
    }

    public function getAJustificatifAttribute(): bool
    {
        return ! empty($this->justificatif_path);
    }
}
