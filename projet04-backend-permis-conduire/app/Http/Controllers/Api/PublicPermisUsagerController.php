<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\FormationAutoEcole;
use Carbon\Carbon;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

#[Group(
    'Permis — intégration publique (v1)',
    description: 'Endpoint **`GET /api/v1/permis/usager`** sans `auth.token`. Authentification par **`X-API-KEY`** (`PUBLIC_API_KEY`). Filtre IP optionnel : `PUBLIC_API_ALLOWED_IPS` (liste séparée par des virgules) ; la première adresse de **`X-Forwarded-For`** est comparée à cette liste. Clés révoquées : `PUBLIC_API_REVOKED_KEYS`.'
)]
class PublicPermisUsagerController extends Controller
{
    #[Endpoint(
        title: 'Rechercher un usager et son permis',
        description: 'Recherche par **`numero_permis`** (obligatoire). Filtres optionnels : `nom`, `prenom` (égalité exacte insensible à la casse), `date_naissance` (`YYYY-MM-DD`), `nip` (AND). Réponse plate : identité + champs permis **fusionnés** sur tous les dossiers du candidat (première valeur non vide ; ordre par « richesse » permis puis `updated_at`).'
    )]
    #[QueryParameter('nom', description: 'Nom de famille — optionnel, correspondance exacte insensible à la casse.', type: 'string', required: false)]
    #[QueryParameter('prenom', description: 'Prénom(s) — optionnel, correspondance exacte insensible à la casse.', type: 'string', required: false)]
    #[QueryParameter('date_naissance', description: 'Date ISO stricte `YYYY-MM-DD` — optionnel.', type: 'string', format: 'date', required: false)]
    #[QueryParameter('numero_permis', description: 'Numéro de permis — obligatoire, égalité stricte sur la colonne `dossiers.numero_permis` (au moins un dossier du candidat doit correspondre).', type: 'string', required: true)]
    #[QueryParameter('nip', description: 'NIP — optionnel, filtre supplémentaire (égalité stricte).', type: 'string', required: false)]
    #[ScrambleResponse(200, 'Identité + permis (tous les champs listés dans le contrat ; optionnels à `null`).')]
    #[ScrambleResponse(400, '`numero_permis` manquant ou vide.')]
    #[ScrambleResponse(401, '`X-API-KEY` absent ou invalide.')]
    #[ScrambleResponse(403, 'IP non autorisée (whitelist) ou clé révoquée.')]
    #[ScrambleResponse(404, 'Aucun enregistrement pour la combinaison fournie.')]
    #[ScrambleResponse(422, '`date_naissance` hors format `YYYY-MM-DD` ou date calendaire invalide.')]
    public function show(Request $request): JsonResponse
    {
        $nom = $this->queryString($request, 'nom');
        $prenom = $this->queryString($request, 'prenom');
        $dateNaissance = $this->queryString($request, 'date_naissance');
        $numeroPermis = $this->queryString($request, 'numero_permis');
        $nip = $this->queryString($request, 'nip');

        if ($numeroPermis === null) {
            return response()->json([
                'message' => 'Le paramètre numero_permis est obligatoire.',
            ], 400);
        }

        if ($dateNaissance !== null) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateNaissance)) {
                return response()->json([
                    'message' => 'Le paramètre date_naissance doit être au format ISO 8601 (YYYY-MM-DD).',
                ], 422);
            }

            $parsedImmutable = \DateTimeImmutable::createFromFormat('!Y-m-d', $dateNaissance);
            $errors = \DateTimeImmutable::getLastErrors();
            if (
                $parsedImmutable === false
                || ($errors['warning_count'] ?? 0) > 0
                || ($errors['error_count'] ?? 0) > 0
                || $parsedImmutable->format('Y-m-d') !== $dateNaissance
            ) {
                return response()->json([
                    'message' => 'Le paramètre date_naissance doit être au format ISO 8601 (YYYY-MM-DD).',
                ], 422);
            }
        }

        $query = Candidat::query()
            ->select('candidats.*')
            ->join('personnes', 'personnes.id', '=', 'candidats.personne_id')
            ->whereHas('dossiers', function ($q) use ($numeroPermis) {
                $q->where('numero_permis', $numeroPermis);
            });

        if ($nom !== null) {
            $query->whereRaw('LOWER(personnes.nom) = ?', [mb_strtolower($nom, 'UTF-8')]);
        }
        if ($prenom !== null) {
            $query->whereRaw('LOWER(personnes.prenom) = ?', [mb_strtolower($prenom, 'UTF-8')]);
        }
        if ($dateNaissance !== null) {
            $query->whereDate('candidats.date_naissance', '=', $dateNaissance);
        }

        if ($nip !== null) {
            $query->where('candidats.nip', $nip);
        }

        /** @var Candidat|null $candidat */
        $candidat = $query
            ->with(['personne', 'dossiers.formation.typePermis', 'dossiers.centre'])
            ->first();

        if ($candidat === null) {
            return response()->json([
                'message' => 'Aucun usager ne correspond à la combinaison de paramètres fournie.',
            ], 404);
        }

        $personne = $candidat->personne;
        $permis = $this->mergePermisFieldsFromDossiers($candidat);

        $payload = [
            'id' => $candidat->id,
            'numero_usager' => $candidat->numero_candidat,
            'nip' => $candidat->nip,
            'nom' => $personne?->nom,
            'prenom' => $personne?->prenom,
            'date_naissance' => $candidat->date_naissance instanceof \DateTimeInterface
                ? $candidat->date_naissance->format('Y-m-d')
                : $this->optionalDateString($candidat->date_naissance),
            'lieu_naissance' => $candidat->lieu_naissance,
            'nationalite' => $candidat->nationalite,
            'genre' => $candidat->genre,
            'type_piece' => $candidat->type_piece,
            'numero_piece' => $candidat->numero_piece,
            'email' => $personne?->email,
            'contact' => $personne?->contact,
            'adresse' => $personne?->adresse,
            'numero_permis' => $permis['numero_permis'],
            'categorie_permis' => $permis['categorie_permis'],
            'ville_permis' => $permis['ville_permis'],
            'codification_permis' => $permis['codification_permis'],
            'date_delivrance_permis' => $permis['date_delivrance_permis'],
            'date_obtention_permis' => $permis['date_obtention_permis'],
            'lieu_obtention_permis' => $permis['lieu_obtention_permis'],
            'date_expiration_permis' => $permis['date_expiration_permis'],
            'numero_origine_permis' => $permis['numero_origine_permis'],
            'date_validite_permis' => $permis['date_validite_permis'],
        ];

        foreach (['email', 'contact', 'adresse', 'numero_permis', 'categorie_permis', 'ville_permis', 'codification_permis',
            'date_delivrance_permis', 'date_obtention_permis', 'lieu_obtention_permis', 'date_expiration_permis',
            'numero_origine_permis', 'date_validite_permis', 'nip'] as $nullableKey) {
            if (array_key_exists($nullableKey, $payload) && ($payload[$nullableKey] === '' || $payload[$nullableKey] === false)) {
                $payload[$nullableKey] = null;
            }
        }

        return response()->json($payload, 200, [], JSON_UNESCAPED_UNICODE);
    }

    private function queryString(Request $request, string $key): ?string
    {
        if (!$request->query->has($key)) {
            return null;
        }
        $v = $request->query($key);
        if (!is_string($v)) {
            return null;
        }
        $t = trim($v);

        return $t === '' ? null : $t;
    }

    /**
     * Un candidat peut avoir plusieurs dossiers : un avec `numero_permis`, un autre avec les dates, etc.
     * On fusionne en prenant la première valeur non vide en parcourant les dossiers du « plus riche » au plus pauvre.
     *
     * @return array{
     *   numero_permis: ?string,
     *   categorie_permis: ?string,
     *   ville_permis: ?string,
     *   codification_permis: ?string,
     *   date_delivrance_permis: ?string,
     *   date_obtention_permis: ?string,
     *   lieu_obtention_permis: ?string,
     *   date_expiration_permis: ?string,
     *   numero_origine_permis: ?string,
     *   date_validite_permis: ?string
     * }
     */
    private function mergePermisFieldsFromDossiers(Candidat $candidat): array
    {
        $defaults = [
            'numero_permis' => null,
            'categorie_permis' => null,
            'ville_permis' => null,
            'codification_permis' => null,
            'date_delivrance_permis' => null,
            'date_obtention_permis' => null,
            'lieu_obtention_permis' => null,
            'date_expiration_permis' => null,
            'numero_origine_permis' => null,
            'date_validite_permis' => null,
        ];

        $dossiers = $candidat->dossiers;
        if ($dossiers->isEmpty()) {
            return $defaults;
        }

        /** @var Collection<int, Dossier> $ordered */
        $ordered = $dossiers->sortByDesc(fn (Dossier $d) => $this->dossierPermisRichnessScore($d))->values();

        $firstString = static function (Collection $list, string $attr): ?string {
            foreach ($list as $d) {
                $v = $d->getAttribute($attr);
                if (!is_string($v) || trim($v) === '') {
                    continue;
                }

                return trim($v);
            }

            return null;
        };

        $firstDate = function (Collection $list, string $attr): ?string {
            foreach ($list as $d) {
                $v = $d->getAttribute($attr);
                if ($v === null || $v === '') {
                    continue;
                }
                $formatted = $this->optionalDateString($v);
                if ($formatted !== null) {
                    return $formatted;
                }
            }

            return null;
        };

        $dataCategorieSource = null;
        foreach ($ordered as $d) {
            if (is_array($d->data_categorie) && $d->data_categorie !== []) {
                $dataCategorieSource = $d;
                break;
            }
        }

        $formationForCategorie = null;
        foreach ($ordered as $d) {
            if ($d->relationLoaded('formation') && $d->formation !== null) {
                $formationForCategorie = $d->formation;
                break;
            }
        }

        $ville = null;
        foreach ($ordered as $d) {
            if ($d->relationLoaded('centre') && $d->centre !== null && filled($d->centre->libelle)) {
                $ville = $d->centre->libelle;
                break;
            }
        }

        return [
            'numero_permis' => $firstString($ordered, 'numero_permis'),
            'categorie_permis' => $this->resolveCategoriePermis($dataCategorieSource, $formationForCategorie),
            'ville_permis' => $ville,
            'codification_permis' => $this->firstCodificationCode($dataCategorieSource),
            'date_delivrance_permis' => $firstDate($ordered, 'date_de_delivrance_du_permis'),
            'date_obtention_permis' => $firstDate($ordered, 'date_de_dobtention_du_permis'),
            'lieu_obtention_permis' => $firstString($ordered, 'lieu_de_dobtention_du_permis'),
            'date_expiration_permis' => $firstDate($ordered, 'date_expiration'),
            'numero_origine_permis' => $firstString($ordered, 'numero_origine_permis'),
            'date_validite_permis' => $firstDate($ordered, 'expiration_date'),
        ];
    }

    private function dossierPermisRichnessScore(Dossier $d): int
    {
        $score = 0;
        if (filled(trim((string) ($d->numero_permis ?? '')))) {
            $score += 40;
        }
        foreach ([
            'date_de_delivrance_du_permis',
            'date_de_dobtention_du_permis',
            'lieu_de_dobtention_du_permis',
            'date_expiration',
            'expiration_date',
            'numero_origine_permis',
        ] as $col) {
            $v = $d->getAttribute($col);
            if ($v !== null && $v !== '') {
                $score += 12;
            }
        }
        if (is_array($d->data_categorie) && $d->data_categorie !== []) {
            $score += 20;
        }
        if ($d->centre_id) {
            $score += 5;
        }
        if ($d->formation_id) {
            $score += 5;
        }

        return $score * 1_000_000 + ($d->updated_at?->getTimestamp() ?? 0);
    }

    private function resolveCategoriePermis(?Dossier $dataSource, ?FormationAutoEcole $formationFallback): ?string
    {
        if ($dataSource !== null) {
            $codes = [];
            if (is_array($dataSource->data_categorie)) {
                foreach ($dataSource->data_categorie as $row) {
                    if (is_array($row) && !empty($row['classe'])) {
                        $codes[] = (string) $row['classe'];
                    }
                }
            }
            $codes = array_values(array_unique($codes));
            if ($codes !== []) {
                return implode(', ', $codes);
            }
        }

        return $formationFallback?->typePermis?->code;
    }

    private function firstCodificationCode(?Dossier $dossier): ?string
    {
        if ($dossier === null || !is_array($dossier->data_categorie)) {
            return null;
        }
        foreach ($dossier->data_categorie as $row) {
            if (is_array($row) && !empty($row['codification_code'])) {
                return (string) $row['codification_code'];
            }
        }

        return null;
    }

    private function optionalDateString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        try {
            return Carbon::parse((string) $value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
