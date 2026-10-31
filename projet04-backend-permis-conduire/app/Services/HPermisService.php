<?php

namespace App\Services;

use App\Models\HPermis;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
class HPermisService
{
    public function createPermis(array $data)
    {
        // Liste des champs qui sont des dates
        $dateFields = ['date_naissance', 'date_obtention', 'date_validite', 'date_renou1', 'date_renou2', 'date_renou3'];

        foreach ($dateFields as $field) {
            if (!empty($data[$field])) {
                // Transforme le format ISO en format Y-m-d (1990-05-15)
                $data[$field] = Carbon::parse($data[$field])->format('Y-m-d');
            }
        }
        // Tu peux ajouter ici ta logique métier complexe
        return HPermis::create($data);
    }

    public function getAll()
    {
        return HPermis::all();
    }

    /**
     * Recherche par nom, prénom, date de naissance et/ou numéro de permis.
     *
     * Cas possibles (4 champs, tous facultatifs, au moins 1 requis) :
     * - Aucun critère → []
     * - 1 seul : nom | prenom | date_naissance | numero_permis → 1re recherche
     * - 2 : nom+prenom | nom+date | nom+numero | prenom+date | prenom+numero | date+numero
     * - 3 : nom+prenom+date | nom+prenom+numero | nom+date+numero | prenom+date+numero
     * - 4 : nom+prenom+date+numero
     *
     * Règle "personne identifiée" (2e recherche = tous les enregistrements de cette personne) :
     * - (nom ET prenom) OU numero_permis OU nomNumeroPermis
     * Sinon : retourner les résultats de la 1re recherche tels quels.
     *
     * @param array $criteria ['nom' => ?, 'prenom' => ?, 'date_naissance' => ?, 'numero_permis' => ?, 'nomNumeroPermis' => ?]
     * @return \Illuminate\Support\Collection
     */
    public function search(array $criteria)
    {
        $nom = $this->normalizeString($criteria['nom'] ?? null);
        $prenom = $this->normalizeString($criteria['prenom'] ?? null);
        $dateNaissance = $this->normalizeDate($criteria['date_naissance'] ?? null);
        $numeroPermis = $this->normalizeString($criteria['numero_permis'] ?? null);
        $nomNumeroPermis = $this->normalizeString($criteria['nomNumeroPermis'] ?? null);

        // Cas 0 : aucun critère
        if ($nom === '' && $prenom === '' && $dateNaissance === null && $numeroPermis === '' && $nomNumeroPermis === '') {
            return collect([]);
        }

        $query = HPermis::query();

        // Critère legacy : path ou body "nomNumeroPermis" → nom OU numero
        if ($nomNumeroPermis !== '') {
            $term = '%' . $nomNumeroPermis . '%';
            $query->where(function ($q) use ($term) {
                $q->where('nom', 'ILIKE', $term)
                    ->orWhere('numero_permis', 'ILIKE', $term);
            });
        }

        if ($nom !== '') {
            $query->where('nom', 'ILIKE', '%' . $nom . '%');
        }
        if ($prenom !== '') {
            $query->where('prenom', 'ILIKE', '%' . $prenom . '%');
        }
        if ($dateNaissance !== null) {
            $query->where('date_naissance', $dateNaissance);
        }
        if ($numeroPermis !== '') {
            $query->where('numero_permis', 'ILIKE', '%' . $numeroPermis . '%');
        }

        $premiersResultats = $query->get();

        if ($premiersResultats->isEmpty()) {
            return $premiersResultats;
        }

        // Personne identifiée → 2e recherche (tous les enregistrements de cette personne)
        $personneIdentifiee = ($nom !== '' && $prenom !== '') || $numeroPermis !== '' || $nomNumeroPermis !== '';
        if (!$personneIdentifiee) {
            return $premiersResultats;
        }

        $premier = $premiersResultats->first();
        $nomExact = $premier->nom;
        $prenomExact = $premier->prenom ?? '';

        if ($nomExact === '' && $prenomExact === '') {
            return $premiersResultats;
        }

        $q = HPermis::query()->where('nom', $nomExact);
        if ($prenomExact !== '') {
            $q->where('prenom', $prenomExact);
        } else {
            $q->where(function ($sub) {
                $sub->whereNull('prenom')->orWhere('prenom', '');
            });
        }

        return $q->get();
    }

    private function normalizeString($value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        return trim((string) $value);
    }

    private function normalizeDate($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Recherche souple paginée sur h_permis : nom, prénom, date de naissance, numéro de permis.
     * Contrat API : au moins un de ces quatre champs non vide (validé dans HPermisController::searchLike).
     * Chaque critère non vide est appliqué en ET. Correspondance partielle, insensible à la casse (ILIKE).
     * Les caractères spéciaux LIKE (%, _) dans la saisie sont traités littéralement.
     *
     * @param array $criteria ['nom' => ?, 'prenom' => ?, 'date_naissance' => ?, 'numero_permis' => ?]
     */
    public function searchOptionalLike(array $criteria, int $page = 1, int $perPage = 25): LengthAwarePaginator
    {
        $nom = $this->normalizeString($criteria['nom'] ?? null);
        $prenom = $this->normalizeString($criteria['prenom'] ?? null);
        $dateNaissance = $this->normalizeString($criteria['date_naissance'] ?? null);
        $numeroPermis = $this->normalizeString($criteria['numero_permis'] ?? null);

        if ($nom === '' && $prenom === '' && $dateNaissance === '' && $numeroPermis === '') {
            throw new \InvalidArgumentException('Au moins un critère parmi nom, prenom, date_naissance, numero_permis est requis.');
        }

        $perPage = max(1, min(100, $perPage));
        $page = max(1, $page);

        $query = HPermis::query();

        if ($nom !== '') {
            $query->where('nom', 'ILIKE', '%' . $this->escapeLikeWildcards($nom) . '%');
        }
        if ($prenom !== '') {
            $query->where('prenom', 'ILIKE', '%' . $this->escapeLikeWildcards($prenom) . '%');
        }
        if ($dateNaissance !== '') {
            $term = '%' . $this->escapeLikeWildcards($dateNaissance) . '%';
            $query->whereRaw(
                "to_char(date_naissance, 'YYYY-MM-DD') ILIKE ?",
                [$term]
            );
        }
        if ($numeroPermis !== '') {
            $query->where('numero_permis', 'ILIKE', '%' . $this->escapeLikeWildcards($numeroPermis) . '%');
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Échappe \ % _ pour les motifs ILIKE PostgreSQL (caractère d'échappement par défaut \).
     */
    private function escapeLikeWildcards(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    /**
     * @deprecated Utiliser search() avec les critères nom, prenom, date_naissance, numero_permis
     */
    public function searchByName(?string $nomOrNumeroPermis)
    {
        return $this->search(['nomNumeroPermis' => $nomOrNumeroPermis ?? '']);
    }
}