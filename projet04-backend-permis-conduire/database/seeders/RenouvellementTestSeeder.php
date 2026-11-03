<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Titulaires fictifs dans h_permis pour tester le renouvellement simplifié.
 *
 * Idempotent : supprime puis recrée uniquement les lignes dont numero_identite commence par TEST-RN-.
 * Les dates sont relatives à aujourd'hui pour que chaque cas (expiré, âge limite 59/60 ans...) reste valable.
 * Un numéro par catégorie (l'écran regroupe les lignes par numéro de permis).
 *
 * php artisan db:seed --class=RenouvellementTestSeeder
 */
class RenouvellementTestSeeder extends Seeder
{
    private const PREFIXE = 'TEST-RN-';

    public function run(): void
    {
        $auj = Carbon::today();

        // [code, nom, prenom, sexe, date_naissance, lieu_naissance, province, [[categorie, numero, date_obtention, date_validite, renou1, renou2]]]
        $titulaires = [
            // 41 ans, B expirée, A encore valide → renouvelle B pour 5 ans
            ['01', 'MOUSSAVOU', 'Alain', 'M', $auj->copy()->subYears(41)->subMonths(3), 'Libreville', 'Estuaire', [
                ['A', '20151A77001', $auj->copy()->subYears(8), $auj->copy()->addYears(2), null, null],
                ['B', '20151B77001', $auj->copy()->subYears(11), $auj->copy()->subMonths(8), null, null],
            ]],
            // 68 ans, B et C expirées → 2 ans
            ['02', 'NZE', 'Bernadette', 'F', $auj->copy()->subYears(68)->subMonths(5), 'Oyem', 'Woleu-Ntem', [
                ['B', '20099B77002', $auj->copy()->subYears(17), $auj->copy()->subYears(2), null, null],
                ['C', '20099C77002', $auj->copy()->subYears(15), $auj->copy()->subYears(3), null, null],
            ]],
            // 59 ans révolus (pas plus de 59) → 5 ans
            ['03', 'ONDO', 'Martin', 'M', $auj->copy()->subYears(59)->subMonths(4), 'Bitam', 'Woleu-Ntem', [
                ['B', '20129B77003', $auj->copy()->subYears(14), $auj->copy()->subMonths(2), null, null],
            ]],
            // 60 ans → 2 ans
            ['04', 'ESSONO', 'Rose', 'F', $auj->copy()->subYears(60)->subMonths(1), 'Lambaréné', 'Moyen-Ogooué', [
                ['B', '20113B77004', $auj->copy()->subYears(15), $auj->copy()->subMonths(6), null, null],
            ]],
            // Tout est valide : rien à renouveler
            ['05', 'MBA', 'Serge', 'M', $auj->copy()->subYears(36), 'Libreville', 'Estuaire', [
                ['A', '20221A77005', $auj->copy()->subYears(4), $auj->copy()->addYears(6), null, null],
                ['B', '20221B77005', $auj->copy()->subYears(4), $auj->copy()->addYears(6), null, null],
            ]],
            // Poids lourd : A, B, C, D, E toutes expirées
            ['06', 'KOUMBA', 'Lucie', 'F', $auj->copy()->subYears(48), 'Mouila', 'Ngounié', [
                ['A', '20084A77006', $auj->copy()->subYears(18), $auj->copy()->subYears(1), null, null],
                ['B', '20084B77006', $auj->copy()->subYears(18), $auj->copy()->subYears(1), null, null],
                ['C', '20084C77006', $auj->copy()->subYears(16), $auj->copy()->subMonths(10), null, null],
                ['D', '20084D77006', $auj->copy()->subYears(14), $auj->copy()->subMonths(10), null, null],
                ['E', '20084E77006', $auj->copy()->subYears(12), $auj->copy()->subMonths(4), null, null],
            ]],
            // Déjà renouvelé deux fois par le passé, à nouveau expiré
            ['07', 'NDONG', 'Félix', 'M', $auj->copy()->subYears(54), 'Makokou', 'Ogooué-Ivindo', [
                ['B', '19986B77007', $auj->copy()->subYears(28), $auj->copy()->subMonths(1), $auj->copy()->subYears(16), $auj->copy()->subYears(6)],
            ]],
            // C expirée hier, B expire dans 3 semaines (pas encore expirée)
            ['08', 'OBIANG', 'Claire', 'F', $auj->copy()->subYears(31), 'Port-Gentil', 'Ogooué-Maritime', [
                ['B', '20168B77008', $auj->copy()->subYears(10), $auj->copy()->addWeeks(3), null, null],
                ['C', '20168C77008', $auj->copy()->subYears(10), $auj->copy()->subDay(), null, null],
            ]],
            // 75 ans, A seule expirée depuis longtemps → 2 ans
            ['09', 'MOUKAGNI', 'Jacques', 'M', $auj->copy()->subYears(75), 'Tchibanga', 'Nyanga', [
                ['A', '19955A77009', $auj->copy()->subYears(31), $auj->copy()->subYears(9), null, null],
            ]],
            // 22 ans, B expirée (permis probatoire court) → 5 ans
            ['10', 'MINTSA', 'Kevin', 'M', $auj->copy()->subYears(22)->subMonths(2), 'Franceville', 'Haut-Ogooué', [
                ['B', '20232B77010', $auj->copy()->subYears(3), $auj->copy()->subWeeks(2), null, null],
            ]],
            // 3 permis distincts (B, C, D) obtenus à des dates et dans des provinces différentes, rattachés à la même personne
            ['11', 'ASSOUMOU', 'Pascal', 'M', $auj->copy()->subYears(45), 'Libreville', 'Estuaire', [
                ['B', '20051B77011', $auj->copy()->subYears(21), $auj->copy()->subYears(1), $auj->copy()->subYears(11), null, 'FICHE_ENREGISTREMENT', 'Estuaire'],
                ['C', '20112C77011', $auj->copy()->subYears(15), $auj->copy()->subMonths(5), null, null, 'DUPLICATA', 'Haut-Ogooué'],
                ['D', '20178D77011', $auj->copy()->subYears(9), $auj->copy()->addYears(1), null, null, 'DUPLICATA', 'Ogooué-Maritime'],
            ]],
        ];

        DB::transaction(function () use ($titulaires) {
            DB::table('h_permis')->where('numero_identite', 'like', self::PREFIXE . '%')->delete();

            $lignes = [];
            foreach ($titulaires as [$code, $nom, $prenom, $sexe, $naissance, $lieuNaissance, $province, $categories]) {
                foreach ($categories as $ligne) {
                    // Type de permis et province d'obtention facultatifs (par défaut : duplicata dans la province du titulaire)
                    [$categorie, $numero, $obtention, $validite, $renou1, $renou2] = $ligne;
                    $typePermis = $ligne[6] ?? 'DUPLICATA';
                    $lieuObtention = $ligne[7] ?? $province;
                    $lignes[] = [
                        'id' => (string) Str::uuid(),
                        'numero_identite' => self::PREFIXE . $code,
                        'nom' => $nom,
                        'prenom' => $prenom,
                        'sexe' => $sexe,
                        'nationalite' => 'Gabonaise',
                        'date_naissance' => $naissance->toDateString(),
                        'lieu_naissance' => $lieuNaissance,
                        'numero_permis' => $numero,
                        'type_permis' => $typePermis,
                        'categorie' => $categorie,
                        'date_obtention' => $obtention->toDateString(),
                        'lieu_obtention' => $lieuObtention,
                        'date_validite' => $validite->toDateString(),
                        // Matricule de fiche d'enregistrement : X à la place de la catégorie
                        'numero_origine_permis' => substr($numero, 0, 5) . 'X' . substr($numero, 6),
                        'lieu_origine' => $lieuObtention,
                        'date_renou1' => $renou1?->toDateString(),
                        'date_renou2' => $renou2?->toDateString(),
                        'date_renou3' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }

            DB::table('h_permis')->insert($lignes);
        });

        $this->command->info(count($titulaires) . ' titulaires de test (' . self::PREFIXE . '*) créés dans h_permis.');
    }
}
