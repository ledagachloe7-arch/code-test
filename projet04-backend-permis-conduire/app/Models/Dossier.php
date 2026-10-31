<?php

namespace App\Models;

use App\Http\Services\CandidatService;
use App\Notifications\PaiementToDo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\Log;

class Dossier extends Model
{
    use HasUuids;
    // Constante pour centraliser le nom du statut
    const STATUS_PENDING = 'EN_ATTENTE';

    /**
     * Libellé métier exact pour `dossiers.statut` — ne pas le reformuler (espaces, casse, « ENVOYER » sans accent).
     * Transfert CNEDDT réussi + filtre `GET /dossiers/envoi-biometrie`.
     */
    const STATUT_DOSSIER_ENVOYER = 'DOSSIER ENVOYER';

    /**
     * Après retour CNEDDT pour modification : `PUT/PATCH` dossier repasse par ce statut (libellé exact, « À » accentué).
     * Distinct de `STATUT_DOSSIER_ENVOYER` (transfert CNEDDT réussi / liste carte).
     */
    const STATUT_ENVOI_A_LA_BIOMETRIE = 'ENVOI À LA BIOMETRIE';

    /** Timeout du verrou en minutes (déverrouillage automatique après inactivité). */
    const LOCK_TIMEOUT_MINUTES = 30;

    protected $table = 'dossiers';

    protected $fillable = [
        'candidat_id',
        'auto_ecole_id',
        'formation_id',
        'numero',
        'utilisateur_id',
        'type_demande_id',
        'statut',
        'commentaires',
        'referenciel_id',
        'date_expiration',
        'numero_permis',
        'numero_origine_permis',
        'lieu_de_dobtention_du_permis',
        'date_de_dobtention_du_permis',
        'date_de_delivrance_du_permis',
        // code_paiement : hors fillable — généré / verrouillé dans booted(), non assignable en masse.
        'expired',
        'expiration_date',
        'suspended',
        'suspended_date',
        'province_id',
        'centre_id',
        'data_categorie',
        'is_locked',
        'opened_by',
        'opened_at',
    ];

    protected $casts = [
        'statut' => 'string',
        'commentaires' => 'array',
        'data_categorie' => 'array',
        'expired' => 'boolean',
        'expiration_date' => 'date',
        'date_expiration' => 'date',
        'date_de_delivrance_du_permis' => 'date',
        'date_de_dobtention_du_permis' => 'date',
        'suspended' => 'boolean',
        'suspended_date' => 'date',
        'is_locked' => 'boolean',
        'opened_at' => 'datetime',
    ];

    /**
     * Agent ayant ouvert le dossier (verrouillage).
     */
    public function openedByUser(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'opened_by');
    }

    /**
     * Vérifie si le verrou est expiré (timeout d'inactivité).
     */
    public function isLockExpired(): bool
    {
        if (!$this->opened_at) {
            return true;
        }
        return $this->opened_at->addMinutes(self::LOCK_TIMEOUT_MINUTES)->isPast();
    }

    /**
     * Vérifie si le dossier est actuellement verrouillé par quelqu'un d'autre (et non expiré).
     */
    public function isLockedByOther(?string $currentUserId): bool
    {
        if (!$this->is_locked || !$this->opened_by) {
            return false;
        }
        if ($this->isLockExpired()) {
            return false;
        }
        return $this->opened_by !== $currentUserId;
    }

    public function candidat(): BelongsTo
    {
        return $this->belongsTo(Candidat::class);
    }

    public function referentiel(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'referenciel_id');
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'province_id');
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Referentiel::class, 'centre_id');
    }

    public function autoEcole(): BelongsTo
    {
        return $this->belongsTo(AutoEcole::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class);
    }

    public function formation(): BelongsTo
    {
        return $this->belongsTo(FormationAutoEcole::class);
    }

    public function typeDemande(): BelongsTo
    {
        return $this->belongsTo(TypeDemande::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function programmeSessions(): HasMany
    {
        return $this->hasMany(ProgrammeSession::class);
    }

    public function resultats(): HasMany
    {
        return $this->hasMany(Resultat::class, 'dossier_id');
    }

    /**
     * Relation : Un dossier peut avoir plusieurs paiements
     */
    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }
    /**
     * Scope pour filtrer par n'importe quel statut
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('statut', strtolower($status));
    }

    protected static function booted()
    {
        static::saving(function ($model) {
            $originalCode = $model->getOriginal('code_paiement');

            // Une fois persisté en base, le code de paiement ne change plus (ignore toute valeur
            // renvoyée par le front / un assignement vide lors d’un update ou refresh).
            if ($originalCode !== null && $originalCode !== '') {
                $model->code_paiement = $originalCode;

                return;
            }

            // Première attribution : uniquement en attente de paiement et sans code encore en base.
            if (
                $model->statut === 'EN_ATTENTE_PAIEMENT'
                && ($model->code_paiement === null || $model->code_paiement === '')
            ) {
                $model->code_paiement = app(CandidatService::class)
                    ->generateUniquePaymentCode($model->candidat, $model->getKey());
            }
        });

        /* static::saved(function ($model) {

            if (
                $model->statut === 'EN_ATTENTE_PAIEMENT'
                && $model->wasChanged('statut')
            ) {
                $user = optional($model->candidat)
                    ->personne
                    ->utilisateur;

                if ($user) {
                    $user->notify(new PaiementToDo($user,$model));
                } else {
                    Log::info('SMS non envoyé');
                }
            }
        }); */
    }
}
