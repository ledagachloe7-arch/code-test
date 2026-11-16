<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Titulaires DÉJÀ DIGITALISÉS avec les 5 catégories A, B, C, D, E, pour tester le renouvellement simplifié.
 *
 * Pour chaque titulaire :
 *  - 5 lignes dans h_permis (registre), numero_identite = TEST-RC-xx ;
 *  - utilisateur (ROLE_CANDIDAT) + personne + candidat (numero_piece = TEST-RC-xx) ;
 *  - un dossier DUPLICATA au statut « DOSSIER ENVOYER » (digitalisation transmise) avec les 5 catégories
 *    dans data_categorie : le numéro de permis ouvre donc directement le renouvellement.
 *
 * Idempotent : supprime puis recrée uniquement ses données (y compris les renouvellements faits sur ces titulaires).
 * Les dates sont relatives à aujourd'hui.
 *
 * php artisan db:seed --class=RenouvellementCompletSeeder
 */
class RenouvellementCompletSeeder extends Seeder
{
    private const PREFIXE = 'TEST-RC-';
    private const EMAIL_DOMAINE = '@test-rc.local';
    private const CATEGORIES = ['A', 'B', 'C', 'D', 'E'];

    public function run(): void
    {
        $auj = Carbon::today();

        // [nom, prenom, sexe, date_naissance, lieu_naissance, province, validité de A, B, C, D, E en jours par rapport à aujourd'hui (négatif = expirée)]
        $titulaires = [
            ['MAKAYA', 'Jean', 'M', $auj->copy()->subYears(45)->subMonths(2), 'Libreville', 'Estuaire', [-400, -400, -240, -240, -120]],
            ['NGOMA', 'Sylvie', 'F', $auj->copy()->subYears(62)->subMonths(4), 'Lambaréné', 'Moyen-Ogooué', [-300, -300, -200, -200, -100]],
            ['BOUSSOUGOU', 'Patrick', 'M', $auj->copy()->subYears(59)->subMonths(11), 'Mouila', 'Ngounié', [-90, -90, -60, -60, -30]],
            ['MOUNDOUNGA', 'Alice', 'F', $auj->copy()->subYears(60)->subDays(15), 'Tchibanga', 'Nyanga', [-90, -90, -60, -60, -30]],
            ['EYENE', 'Hervé', 'M', $auj->copy()->subYears(38)->subMonths(6), 'Oyem', 'Woleu-Ntem', [-200, -200, -150, 730, -50]],
            ['ALLOGO', 'Brigitte', 'F', $auj->copy()->subYears(51)->subMonths(1), 'Bitam', 'Woleu-Ntem', [-200, -200, 730, -150, -50]],
            ['OBAME', 'Thierry', 'M', $auj->copy()->subYears(33)->subMonths(8), 'Libreville', 'Estuaire', [900, 900, 1100, 1100, 1300]],
            ['NZAMBA', 'Pauline', 'F', $auj->copy()->subYears(70)->subMonths(3), 'Koulamoutou', 'Ogooué-Lolo', [-3300, -3300, -3200, -3200, -3000]],
            ['MENGUE', 'Rodrigue', 'M', $auj->copy()->subYears(27)->subMonths(5), 'Franceville', 'Haut-Ogooué', [-120, -120, 600, 600, 800]],
            ['KOUMBA', 'Georges', 'M', $auj->copy()->subYears(56)->subMonths(7), 'Port-Gentil', 'Ogooué-Maritime', [300, 300, -1, 14, 400]],
            ['BIYOGHE', 'Nadège', 'F', $auj->copy()->subYears(44)->subMonths(9), 'Libreville', 'Estuaire', [-500, -500, -400, -400, -300]],
            ['MBOUMBA', 'Christian', 'M', $auj->copy()->subYears(65)->subMonths(2), 'Mouila', 'Ngounié', [500, 500, -180, -180, 700]],
            ['NDZIGOU', 'Estelle', 'F', $auj->copy()->subYears(35)->subMonths(4), 'Makokou', 'Ogooué-Ivindo', [-60, -60, -45, -45, -30]],
            ['ONDIMBA', 'Serge', 'M', $auj->copy()->subYears(48)->subMonths(10), 'Franceville', 'Haut-Ogooué', [-150, -150, 365, -90, -60]],
            ['MOUSSOUNDA', 'Irène', 'F', $auj->copy()->subYears(61)->subMonths(6), 'Tchibanga', 'Nyanga', [-700, -700, -600, -600, -500]],
            ['ESSONE', 'Marc', 'M', $auj->copy()->subYears(29)->subMonths(1), 'Oyem', 'Woleu-Ntem', [-30, -30, -20, -20, -10]],
            ['NKOGHE', 'Laure', 'F', $auj->copy()->subYears(53)->subMonths(3), 'Libreville', 'Estuaire', [-90, -90, -30, -30, -15]],
            ['IVANGA', 'Roger', 'M', $auj->copy()->subYears(74)->subMonths(8), 'Lastoursville', 'Ogooué-Lolo', [-1000, -1000, -800, 200, -600]],
            ['MAGANGA', 'Josiane', 'F', $auj->copy()->subYears(42)->subMonths(2), 'Port-Gentil', 'Ogooué-Maritime', [1000, 1000, 1200, 1200, -20]],
            ['OYANE', 'Didier', 'M', $auj->copy()->subYears(58)->subMonths(5), 'Lambaréné', 'Moyen-Ogooué', [-250, -250, -200, -200, -150]],
            ['LEKOGO', 'Chantal', 'F', $auj->copy()->subYears(66)->subMonths(9), 'Okondja', 'Haut-Ogooué', [-400, -400, -365, -365, -200]],
            ['NDONG', 'Ulrich', 'M', $auj->copy()->subYears(31)->subMonths(7), 'Libreville', 'Estuaire', [-45, -45, -40, -40, -35]],
        ];

        $typeDuplicata = DB::table('type_demandes')->where('name', 'DUPLICATA')->value('id');
        $agentId = DB::table('utilisateurs')->where('email', 'admin@permis.local')->value('id');
        // Auto-école / formation / référentiel repris d'une digitalisation transmise existante (colonnes facultatives)
        $modele = DB::table('dossiers')->where('statut', 'DOSSIER ENVOYER')->where('type_demande_id', $typeDuplicata)
            ->whereNotNull('auto_ecole_id')->first(['auto_ecole_id', 'formation_id', 'referenciel_id']);

        DB::transaction(function () use ($titulaires, $auj, $typeDuplicata, $agentId, $modele) {
            $this->supprimer();

            $hPermis = [];
            $resume = [];
            foreach ($titulaires as $i => [$nom, $prenom, $sexe, $naissance, $lieuNaissance, $province, $validites]) {
                $n = $i + 1;
                $code = str_pad((string) $n, 2, '0', STR_PAD_LEFT);
                $identite = self::PREFIXE . $code;
                $now = now();

                // Numéros : année d'obtention + chiffre + catégorie + 88 + n° titulaire (ex. 20081C88001)
                $annee = 2000 + ($n % 15);
                $numeros = [];
                $lignes = [];
                foreach (self::CATEGORIES as $k => $cat) {
                    $numero = $annee . ($k + 1) . $cat . '88' . str_pad((string) $n, 3, '0', STR_PAD_LEFT);
                    $obtention = $auj->copy()->subYears(26 - $k * 2)->addDays($n);
                    // Pas d'obtention avant 18 ans
                    if ($obtention->lt($naissance->copy()->addYears(18))) {
                        $obtention = $naissance->copy()->addYears(18 + $k);
                    }
                    $validite = $auj->copy()->addDays($validites[$k]);
                    $numeros[$cat] = $numero;

                    $hPermis[] = [
                        'id' => (string) Str::uuid(),
                        'numero_identite' => $identite,
                        'nom' => $nom,
                        'prenom' => $prenom,
                        'sexe' => $sexe,
                        'nationalite' => 'Gabonaise',
                        'date_naissance' => $naissance->toDateString(),
                        'lieu_naissance' => $lieuNaissance,
                        'numero_permis' => $numero,
                        'type_permis' => 'DUPLICATA',
                        'categorie' => $cat,
                        'date_obtention' => $obtention->toDateString(),
                        'lieu_obtention' => $province,
                        'date_validite' => $validite->toDateString(),
                        'numero_origine_permis' => substr($numero, 0, 5) . 'X' . substr($numero, 6),
                        'lieu_origine' => $province,
                        'date_renou1' => null,
                        'date_renou2' => null,
                        'date_renou3' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $lignes[] = [
                        'classe' => $cat,
                        'ville' => $lieuNaissance,
                        'codification_code' => $numero,
                        'valable_du' => $obtention->toDateString(),
                        'jusqu_au' => $validite->toDateString(),
                    ];
                }

                $telephone = '0779' . str_pad((string) $n, 4, '0', STR_PAD_LEFT);
                $utilisateurId = (string) Str::uuid();
                DB::table('utilisateurs')->insert([
                    'id' => $utilisateurId,
                    'email' => 'test-rc-' . $code . self::EMAIL_DOMAINE,
                    'password' => Hash::make('123456'),
                    'role' => 'ROLE_CANDIDAT',
                    'telephone' => $telephone,
                    'verified_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $personneId = (string) Str::uuid();
                DB::table('personnes')->insert([
                    'id' => $personneId,
                    'utilisateur_id' => $utilisateurId,
                    'nom' => $nom,
                    'prenom' => $prenom,
                    'email' => 'test-rc-' . $code . self::EMAIL_DOMAINE,
                    'adresse' => $lieuNaissance,
                    'contact' => $telephone,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $candidatId = (string) Str::uuid();
                DB::table('candidats')->insert([
                    'id' => $candidatId,
                    'personne_id' => $personneId,
                    'numero_candidat' => 'CAN-TESTRC-' . $code,
                    'date_naissance' => $naissance->toDateString(),
                    'lieu_naissance' => $lieuNaissance,
                    'nip' => null,
                    'type_piece' => 'CNI',
                    'numero_piece' => $identite,
                    'nationalite' => 'Gabonaise',
                    'genre' => $sexe,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                // Numéro principal du dossier de digitalisation : celui de la catégorie C
                $numeroPrincipal = $numeros['C'];
                DB::table('dossiers')->insert([
                    'id' => (string) Str::uuid(),
                    'candidat_id' => $candidatId,
                    'auto_ecole_id' => $modele->auto_ecole_id ?? null,
                    'formation_id' => $modele->formation_id ?? null,
                    'referenciel_id' => $modele->referenciel_id ?? null,
                    'type_demande_id' => $typeDuplicata,
                    'statut' => 'DOSSIER ENVOYER',
                    'numero_permis' => $numeroPrincipal,
                    'numero_origine_permis' => null,
                    'date_de_dobtention_du_permis' => $lignes[0]['valable_du'],
                    'date_de_delivrance_du_permis' => $lignes[2]['valable_du'],
                    'lieu_de_dobtention_du_permis' => $lieuNaissance,
                    'code_paiement' => strtolower(Str::random(8)),
                    'numero' => strtoupper(Str::random(6)),
                    'data_categorie' => json_encode($lignes),
                    'utilisateur_id' => $agentId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $resume[] = sprintf('%-11s %-11s %-10s %3d ans', $numeroPrincipal, $nom, $prenom, $naissance->age);
            }

            DB::table('h_permis')->insert($hPermis);

            $this->command->info(count($titulaires) . ' titulaires digitalisés (' . self::PREFIXE . '*) avec les catégories A à E :');
            foreach ($resume as $ligne) {
                $this->command->line('  ' . $ligne);
            }
        });

        // Les listes de dossiers sont mises en cache (tag « dossiers »)
        try {
            Cache::tags(['dossiers'])->flush();
        } catch (\Throwable) {
            Cache::flush();
        }
    }

    /** Supprime les données créées par ce seeder (et tout dossier rattaché à ses candidats). */
    private function supprimer(): void
    {
        $candidatIds = DB::table('candidats')->where('numero_piece', 'like', self::PREFIXE . '%')->pluck('id');
        $dossierIds = DB::table('dossiers')->whereIn('candidat_id', $candidatIds)->pluck('id');

        if ($dossierIds->isNotEmpty()) {
            // Tables qui référencent dossiers.id (paiements, historiques, documents...)
            $refs = DB::select("
                select kcu.table_name, kcu.column_name
                from information_schema.referential_constraints rc
                join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name and kcu.constraint_schema = rc.constraint_schema
                join information_schema.constraint_column_usage ccu on ccu.constraint_name = rc.unique_constraint_name and ccu.constraint_schema = rc.unique_constraint_schema
                where ccu.table_name = 'dossiers' and ccu.column_name = 'id' and kcu.table_schema = 'public'
            ");
            foreach ($refs as $ref) {
                DB::table($ref->table_name)->whereIn($ref->column_name, $dossierIds)->delete();
            }
            DB::table('dossiers')->whereIn('id', $dossierIds)->delete();
        }

        $personneIds = DB::table('candidats')->whereIn('id', $candidatIds)->pluck('personne_id');
        DB::table('candidats')->whereIn('id', $candidatIds)->delete();
        DB::table('personnes')->whereIn('id', $personneIds)->delete();
        DB::table('utilisateurs')->where('email', 'like', 'test-rc-%' . self::EMAIL_DOMAINE)->delete();
        DB::table('h_permis')->where('numero_identite', 'like', self::PREFIXE . '%')->delete();
    }
}
