<?php

namespace App\Services;

use App\Exceptions\InformatisationException;
use App\Models\AncienPermis;
use App\Models\HPermis;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Informatisation des anciens permis roses.
 *
 * Ancien numéro (registre Excel) : « PP/AAAA /NNNNNN LETTRES » — ex. « 01/1983 /123455 WSDFGH »
 *   PP = province (1 à 9), AAAA = année, NNNNNN = ordre de l'ancien registre, LETTRES = catégories de l'époque.
 * Nouveau numéro : AAAA + P + C + NNNNN (ex. 19831B00001)
 *   - même année et même province que l'ancien, catégorie issue de la colonne Excel ;
 *   - ordre unique par (année, province, catégorie), jamais déjà présent dans h_permis ni déjà attribué ;
 *   - génération sous verrou (pg_advisory_xact_lock) + index unique : aucun doublon, même en simultané.
 */
class InformatisationService
{
    // ------------------------------------------------------------------
    // Lecture de l'ancien numéro
    // ------------------------------------------------------------------

    /**
     * @return array{province: ?int, annee: ?int, ordre: ?string, lettres: ?string, normalise: string, anomalies: string[]}
     */
    public function lireAncienNumero(?string $brut): array
    {
        $s = strtoupper(trim(preg_replace('/\s+/', ' ', (string) $brut)));
        $res = ['province' => null, 'annee' => null, 'ordre' => null, 'lettres' => null, 'normalise' => '', 'anomalies' => []];

        if ($s === '') {
            $res['anomalies'][] = 'Ancien numéro absent.';
            return $res;
        }

        // Tolère espaces en trop, « / », « - » ou « . » comme séparateurs, zéro initial absent (1/1983).
        if (! preg_match('/^(\d{1,2})\s*[\/\-.]\s*(\d{4})\s*[\/\-.]?\s*(\d+)\s*([A-Z]*)$/', $s, $m)) {
            $res['normalise'] = preg_replace('/[^A-Z0-9]/', '', $s);
            $res['anomalies'][] = "Ancien numéro illisible : « {$brut} » (format attendu : PP/AAAA /NNNNNN LETTRES).";
            return $res;
        }

        [$province, $annee, $ordre, $lettres] = [(int) $m[1], (int) $m[2], $m[3], $m[4] !== '' ? $m[4] : null];
        $res = array_merge($res, [
            'province' => $province,
            'annee' => $annee,
            'ordre' => $ordre,
            'lettres' => $lettres,
            // Clé de recherche : province + année + ordre (les lettres ne servent pas à identifier).
            'normalise' => sprintf('%02d/%04d/%s', $province, $annee, ltrim($ordre, '0') ?: '0'),
        ]);

        if (! array_key_exists($province, config('informatisation.provinces'))) {
            $res['anomalies'][] = "Province « {$m[1]} » inconnue (attendu : 1 à 9).";
        }
        if ($annee < 1950 || $annee > (int) now()->year) {
            $res['anomalies'][] = "Année « {$annee} » invraisemblable.";
        }

        return $res;
    }

    /**
     * « B », « B,C », « b c », « BCD » → ['B', 'C', 'D'].
     *
     * @return array{0: string[], 1: string[]} [catégories valides, anomalies]
     */
    public function lireCategories(?string $brut): array
    {
        $valides = config('informatisation.categories');
        $s = strtoupper(trim((string) $brut));
        if ($s === '') {
            return [[], ['Catégorie absente.']];
        }

        $jetons = preg_split('/[\s,;\/+\-]+/', $s, -1, PREG_SPLIT_NO_EMPTY);
        // Lettres collées (« BCD ») : découpées si chaque lettre est une catégorie connue.
        if (count($jetons) === 1 && ! in_array($jetons[0], $valides, true)
            && collect(str_split($jetons[0]))->every(fn ($c) => in_array($c, $valides, true))) {
            $jetons = str_split($jetons[0]);
        }

        $ok = [];
        $anomalies = [];
        foreach ($jetons as $j) {
            if (in_array($j, $valides, true)) {
                $ok[] = $j;
            } else {
                $anomalies[] = "Catégorie « {$j} » inconnue.";
            }
        }

        return [array_values(array_unique($ok)), $anomalies];
    }

    private function lireDate(?string $brut, string $libelle, array &$avertissements): ?string
    {
        $s = trim((string) $brut);
        if ($s === '') {
            return null;
        }
        foreach (['d/m/Y', 'd-m-Y', 'Y-m-d', 'd/m/y'] as $format) {
            $d = \DateTime::createFromFormat('!' . $format, $s);
            if ($d && $d->format($format) === $s) {
                return $d->format('Y-m-d');
            }
        }
        try {
            return Carbon::parse($s)->toDateString();
        } catch (\Throwable) {
            $avertissements[] = "{$libelle} illisible : « {$s} ».";
            return null;
        }
    }

    // ------------------------------------------------------------------
    // Import du fichier Excel (lignes lues par le navigateur)
    // ------------------------------------------------------------------

    private static function role($agent): string
    {
        return strtoupper((string) ($agent->role ?? ''));
    }

    public function peutImporter($agent): bool
    {
        return in_array(self::role($agent), array_map('strtoupper', config('informatisation.roles_import')), true);
    }

    public function peutInformatiser($agent): bool
    {
        return $agent !== null && ! in_array(self::role($agent), array_map('strtoupper', config('informatisation.roles_exclus')), true);
    }

    /**
     * @param array<int, array<string, mixed>> $lignes clés : ancien_numero, nom, prenom, date_naissance, lieu_naissance,
     *                                          categories, date_obtention, date_validite, ligne_excel, brut
     */
    public function importer(array $lignes, ?string $fichier, ?string $lot, $agent): array
    {
        if (! $this->peutImporter($agent)) {
            throw new InformatisationException("Votre profil ne permet pas d'importer le registre.", 403);
        }

        $lot = $lot ?: now()->format('Ymd-His') . '-' . strtoupper(Str::random(4));
        $bilan = ['lot' => $lot, 'recues' => count($lignes), 'importees' => 0, 'deja_importees' => 0, 'en_anomalie' => 0, 'anomalies' => []];

        DB::transaction(function () use ($lignes, $fichier, $lot, $agent, &$bilan) {
            foreach ($lignes as $l) {
                $lecture = $this->lireAncienNumero($l['ancien_numero'] ?? null);
                [$categories, $anomaliesCat] = $this->lireCategories($l['categories'] ?? null);
                $avertissements = [];
                $dateNaissance = $this->lireDate($l['date_naissance'] ?? null, 'Date de naissance', $avertissements);
                $dateObtention = $this->lireDate($l['date_obtention'] ?? null, "Date d'obtention", $avertissements);
                $dateValidite = $this->lireDate($l['date_validite'] ?? null, 'Date de validité', $avertissements);
                $nom = trim((string) ($l['nom'] ?? ''));
                $prenom = trim((string) ($l['prenom'] ?? ''));

                // Ligne déjà importée (même ancien numéro, même personne) : ignorée.
                $existe = AncienPermis::where('ancien_numero_normalise', $lecture['normalise'])
                    ->whereRaw('lower(coalesce(nom, \'\')) = ?', [mb_strtolower($nom)])
                    ->whereRaw('lower(coalesce(prenom, \'\')) = ?', [mb_strtolower($prenom)])
                    ->when($dateNaissance, fn ($q) => $q->whereDate('date_naissance', $dateNaissance))
                    ->exists();
                if ($existe) {
                    $bilan['deja_importees']++;
                    continue;
                }

                $bloquantes = array_merge($lecture['anomalies'], $anomaliesCat);
                if ($nom === '') {
                    $bloquantes[] = 'Nom absent.';
                }
                if (! $categories) {
                    $bloquantes[] = 'Aucune catégorie valide.';
                }
                $toutes = array_merge($bloquantes, $avertissements);

                $a = new AncienPermis();
                $a->forceFill([
                    'lot_import' => $lot,
                    'fichier_source' => $fichier ? mb_substr($fichier, 0, 255) : null,
                    'ligne_excel' => isset($l['ligne_excel']) ? (int) $l['ligne_excel'] : null,
                    'donnees_brutes' => is_array($l['brut'] ?? null) ? $l['brut'] : null,
                    'ancien_numero' => mb_substr(trim((string) ($l['ancien_numero'] ?? '')), 0, 100),
                    'ancien_numero_normalise' => mb_substr($lecture['normalise'], 0, 100),
                    'province_code' => $lecture['province'],
                    'annee' => $lecture['annee'],
                    'ancien_ordre' => $lecture['ordre'],
                    'ancien_lettres' => $lecture['lettres'],
                    'nom' => $nom !== '' ? mb_substr(mb_strtoupper($nom), 0, 100) : null,
                    'prenom' => $prenom !== '' ? mb_substr($prenom, 0, 100) : null,
                    'date_naissance' => $dateNaissance,
                    'lieu_naissance' => mb_substr(trim((string) ($l['lieu_naissance'] ?? '')), 0, 100) ?: null,
                    'categories' => $categories ? implode(',', $categories) : null,
                    'date_obtention' => $dateObtention,
                    'date_validite' => $dateValidite,
                    'statut' => $bloquantes ? AncienPermis::STATUT_ANOMALIE : AncienPermis::STATUT_A_INFORMATISER,
                    'anomalies' => $toutes ? implode(' ', $toutes) : null,
                ])->save();

                $bilan['importees']++;
                if ($bloquantes) {
                    $bilan['en_anomalie']++;
                }
                if ($toutes && count($bilan['anomalies']) < 100) {
                    $bilan['anomalies'][] = ['ligne_excel' => $a->ligne_excel, 'ancien_numero' => $a->ancien_numero, 'anomalies' => $toutes];
                }
            }
        });

        // Anciens numéros partagés par plusieurs personnes (information : chacune recevra un nouveau numéro distinct).
        $bilan['anciens_numeros_partages'] = DB::table('anciens_permis')
            ->select('ancien_numero_normalise', DB::raw('count(*) as nb'))
            ->whereIn('ancien_numero_normalise', function ($q) use ($lot) {
                $q->select('ancien_numero_normalise')->from('anciens_permis')->where('lot_import', $lot);
            })
            ->groupBy('ancien_numero_normalise')
            ->havingRaw('count(*) > 1')
            ->limit(100)
            ->get();

        Log::info('[Informatisation] Import registre Excel', array_merge(
            array_diff_key($bilan, ['anomalies' => 1, 'anciens_numeros_partages' => 1]),
            ['fichier' => $fichier, 'agent_id' => $agent->id ?? null]
        ));

        return $bilan;
    }

    // ------------------------------------------------------------------
    // Recherche par ancien numéro
    // ------------------------------------------------------------------

    public function rechercher(string $saisie)
    {
        $lecture = $this->lireAncienNumero($saisie);
        $alnum = preg_replace('/[^A-Z0-9]/', '', strtoupper($saisie));

        $resultats = AncienPermis::query()
            ->where(function ($q) use ($lecture, $alnum) {
                $q->where('ancien_numero_normalise', $lecture['normalise']);
                if ($alnum !== '') {
                    $q->orWhereRaw("upper(regexp_replace(ancien_numero, '[^A-Za-z0-9]', '', 'g')) = ?", [$alnum]);
                }
            })
            ->orderBy('nom')->orderBy('prenom')
            ->limit(50)
            ->get();

        $partages = $resultats->countBy('ancien_numero_normalise');

        return $resultats->map(function (AncienPermis $a) use ($partages) {
            $a->setAttribute('province_libelle', config('informatisation.provinces')[$a->province_code] ?? null);
            $a->setAttribute('ancien_numero_partage', ($partages[$a->ancien_numero_normalise] ?? 1) > 1);
            $a->setAttribute('apercu_format', $this->apercuFormat($a));
            return $a;
        });
    }

    /** Aperçu du format du futur numéro (le numéro d'ordre n'est attribué qu'à la validation). */
    private function apercuFormat(AncienPermis $a): array
    {
        if (! $a->annee || ! $a->province_code || ! $a->categories) {
            return [];
        }
        return collect(explode(',', $a->categories))
            ->map(fn ($c) => "{$a->annee}-{$a->province_code}-{$c}-" . str_repeat('N', (int) config('informatisation.longueur_ordre')))
            ->all();
    }

    // ------------------------------------------------------------------
    // Génération du nouveau numéro (sans doublon)
    // ------------------------------------------------------------------

    /**
     * Doit être appelée dans une transaction. Retourne la forme normalisée (ex. 19831B00001).
     */
    public function genererNumero(int $annee, int $province, string $categorie, ?string $ancienId, $agent): array
    {
        $prefixe = $annee . $province . $categorie;

        // Verrou exclusif sur (année, province, catégorie) jusqu'à la fin de la transaction.
        DB::select('select pg_advisory_xact_lock(?)', [crc32('informatisation:' . $prefixe)]);

        $regex = '^' . preg_quote($prefixe, '/') . '([0-9]+)$';
        $maxRegistre = (int) DB::scalar(
            "select coalesce(max(substring(n from ?)::bigint), 0) from (
                select upper(regexp_replace(coalesce(numero_permis, ''), '[^A-Za-z0-9]', '', 'g')) as n from h_permis
             ) t where n ~ ?",
            [$regex, $regex]
        );
        $maxAttribue = (int) DB::table('numeros_permis_attribues')
            ->where(['annee' => $annee, 'province_code' => $province, 'categorie' => $categorie])
            ->max('ordre');

        $ordre = max($maxRegistre, $maxAttribue) + 1;
        $longueur = (int) config('informatisation.longueur_ordre');

        // Sécurité supplémentaire : on avance tant que le numéro existe déjà quelque part.
        do {
            $numero = $prefixe . str_pad((string) $ordre, $longueur, '0', STR_PAD_LEFT);
            $pris = DB::table('numeros_permis_attribues')->where('numero', $numero)->exists()
                || HPermis::whereRaw("upper(regexp_replace(coalesce(numero_permis, ''), '[^A-Za-z0-9]', '', 'g')) = ?", [$numero])->exists();
            if ($pris) {
                $ordre++;
            }
        } while ($pris);

        $id = (string) Str::uuid();
        DB::table('numeros_permis_attribues')->insert([
            'id' => $id,
            'numero' => $numero,
            'annee' => $annee,
            'province_code' => $province,
            'categorie' => $categorie,
            'ordre' => $ordre,
            'ancien_permis_id' => $ancienId,
            'attribue_par' => $agent->id ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['id' => $id, 'numero' => $numero, 'ordre' => $ordre];
    }

    // ------------------------------------------------------------------
    // Informatisation
    // ------------------------------------------------------------------

    /**
     * Génère un nouveau numéro par catégorie et crée le permis dans le registre (h_permis).
     * Idempotent : une ligne déjà informatisée renvoie ses numéros sans en générer d'autres.
     */
    public function informatiser(string $ancienId, $agent): AncienPermis
    {
        if (! $this->peutInformatiser($agent)) {
            throw new InformatisationException("Votre profil ne permet pas d'informatiser un permis.", 403);
        }

        return DB::transaction(function () use ($ancienId, $agent) {
            $a = AncienPermis::whereKey($ancienId)->lockForUpdate()->first()
                ?? throw new InformatisationException('Ancien permis introuvable.', 404);

            if ($a->statut === AncienPermis::STATUT_INFORMATISE) {
                return $a;
            }
            if ($a->statut === AncienPermis::STATUT_ANOMALIE) {
                throw new InformatisationException('Ligne en anomalie, à corriger avant informatisation : ' . $a->anomalies, 422);
            }

            // Cette même personne est-elle déjà dans le registre avec cet ancien numéro ? (informatisée par un autre moyen)
            // Même ancien numéro + même nom, prénom et date de naissance. Une autre personne qui partage l'ancien
            // numéro (homonyme, date de naissance différente) n'est PAS bloquée : elle recevra son propre numéro.
            $alnum = preg_replace('/[^A-Z0-9]/', '', strtoupper($a->ancien_numero));
            $dejaRegistre = HPermis::whereRaw("upper(regexp_replace(coalesce(numero_origine_permis, ''), '[^A-Za-z0-9]', '', 'g')) = ?", [$alnum])
                ->where('nom', 'ILIKE', (string) $a->nom)
                ->whereRaw('lower(coalesce(prenom, \'\')) = ?', [mb_strtolower((string) $a->prenom)])
                ->where(function ($q) use ($a) {
                    $a->date_naissance
                        ? $q->whereNull('date_naissance')->orWhereDate('date_naissance', $a->date_naissance->toDateString())
                        : $q->whereRaw('true');
                })
                ->value('numero_permis');
            if ($dejaRegistre) {
                throw new InformatisationException("Ce permis existe déjà dans le registre (n° {$dejaRegistre}).", 409);
            }

            $province = config('informatisation.provinces')[$a->province_code];
            $identite = 'INF-' . strtoupper(substr(str_replace('-', '', $a->id), 0, 12));
            $nouveaux = [];

            foreach (explode(',', $a->categories) as $categorie) {
                $n = $this->genererNumero($a->annee, $a->province_code, $categorie, $a->id, $agent);

                $p = new HPermis();
                $p->forceFill([
                    'numero_identite' => $identite,
                    'nom' => mb_substr((string) $a->nom, 0, 50),
                    'prenom' => $a->prenom ? mb_substr($a->prenom, 0, 50) : null,
                    'date_naissance' => $a->date_naissance,
                    'lieu_naissance' => $a->lieu_naissance,
                    'numero_permis' => $n['numero'],
                    'type_permis' => $categorie,
                    'categorie' => $categorie,
                    'date_obtention' => $a->date_obtention,
                    'lieu_obtention' => $province,
                    'date_validite' => $a->date_validite,
                    'numero_origine_permis' => $a->ancien_numero,
                    'lieu_origine' => $province,
                ])->save();

                DB::table('numeros_permis_attribues')->where('id', $n['id'])->update(['h_permis_id' => $p->id]);
                $nouveaux[] = ['categorie' => $categorie, 'numero' => $n['numero'], 'h_permis_id' => $p->id];
            }

            $a->forceFill([
                'statut' => AncienPermis::STATUT_INFORMATISE,
                'nouveaux_numeros' => $nouveaux,
                'numero_identite' => $identite,
                'informatise_par' => $agent->id ?? null,
                'informatise_par_email' => $agent->email ?? null,
                'informatise_le' => now(),
            ])->save();

            Log::info('[Informatisation] Permis informatisé', [
                'ancien_permis_id' => $a->id,
                'ancien_numero' => $a->ancien_numero,
                'nouveaux_numeros' => array_column($nouveaux, 'numero'),
                'agent_id' => $agent->id ?? null,
            ]);

            return $a;
        });
    }
}
