<?php

namespace App\Services;

use App\Models\Candidat;
use Illuminate\Database\Eloquent\Collection;

class CandidatFilterService
{
    /**
     * Récupère la liste des candidats avec filtre optionnel
     */
    public function listerCandidats(?string $personneId = null): Collection
    {
        return Candidat::query()
            ->byPersonne($personneId) // Utilisation du scope
            ->with('personne')        // Eager loading pour la performance
            ->orderBy('created_at', 'desc')
            ->get();
    }
}