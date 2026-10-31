<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalTransition extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'journal_transitions';
    protected $fillable = [
        'transition_id',
        'circuit_id',
        'transition_code',
        'circuit_libelle',
        'date_heure',
        'auteur',
        'transition_libelle',
        'commentaire',     // le commentaire qui est fait au moment de la transition, au moment du call HTTP (controller), récupérer le commentaire et l'insérer dans ce champ
        'resultat',       // SUCCES | ECHEC
        'statut_depart', // on rentre dans la transition-> on se rend dans l'étape source, on récupere le champ statut_libelle
        'statut_cible', // on rentre dans la transition-> on se rend dans l'étape cible, on récupere le champ statut_libelle
    ];

    protected $casts = [
        'date_heure' => 'datetime',
        'resultat' => ResultatTransition::class 
    ];

    public function transition():BelongsTo
    {
        return $this->belongsTo(Transition::class);
    }

    public function circuit():BelongsTo
    {
        return $this->belongsTo(Circuit::class);
    }

    /* 
    *   Récupère le libelle du Circuit correspondant,
    *   et met à jour automatiquement circuit_libelle avant l’enregistrement 
    */
    protected static function booted()
    {
        static::saving(function ($journalTransition) {
            if ($journalTransition->circuit_id) {
                $circuit = Circuit::find($journalTransition->circuit_id);
                $journalTransition->circuit_libelle = $circuit?->libelle; // null-safe
            }

            /* Remplissage du statut de depart , du statut cible et de la transition*/
            if ($journalTransition->transition_id) {
                $transition = Transition::find($journalTransition->transition_id);
                $etape_source = Etape::find($transition->source_etape_id);
                $etape_cible = Etape::find($transition->cible_etape_id);
                $journalTransition->transition_libelle = $transition?->libelle; // null-safe
                $journalTransition->statut_depart = $etape_source?->statut_libelle; // null-safe
                $journalTransition->statut_cible = $etape_cible?->statut_libelle; // null-safe
                $journalTransition->transition_code = $transition?->code; // null-safe
            }

        });
    }

}

enum ResultatTransition :string{
    case SUCCESS = 'success';
    case ECHEC = 'echec';
}
