<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RegistrePermisSeeder extends Seeder
{
    public function run(): void
    {
        $provinces = [
            1 => 'Estuaire',
            2 => 'Haut-Ogooué',
            3 => 'Moyen-Ogooué',
            4 => 'Ngounié',
            5 => 'Nyanga',
            6 => 'Ogooué-Ivindo',
            7 => 'Ogooué-Lolo',
            8 => 'Ogooué-Maritime',
            9 => 'Woleu-Ntem',
        ];

        $categories = ['A', 'B', 'C', 'D', 'E'];

        $prenoms = [
            'Jean', 'Paul', 'Marie', 'Pierre', 'Joseph',
            'Grace', 'Patrick', 'Michel', 'Sarah', 'David',
            'Estelle', 'Daniel', 'Emmanuel', 'Christelle',
            'Kevin', 'Sandrine', 'Christian', 'Brigitte',
        ];

        $noms = [
            'MABIKA', 'NGUEMA', 'OBAME', 'MBOUMBA',
            'NDONG', 'NZUE', 'MOUKAGNI', 'EKOUA',
            'BONGO', 'MOUSSAVOU', 'ONDO', 'MINTSA',
            'KOUMBA', 'MENGUE', 'ASSOUMOU', 'MAYILA',
        ];

        $faker = \Faker\Factory::create('fr_FR');

        $records = [];

        // 100 titulaires fictifs
        for ($i = 1; $i <= 100; $i++) {
            $provinceCode = (($i - 1) % 9) + 1;
            $province = $provinces[$provinceCode];

            $annee = 2000 + ($i % 25);
            $categorie = $categories[($i - 1) % count($categories)];

            $numeroSequence = str_pad($i, 5, '0', STR_PAD_LEFT);

            // Matricule de duplicata
            $numeroDuplicata = $annee
                . $provinceCode
                . $categorie
                . $numeroSequence;

            // Matricule de fiche d'enregistrement
            $numeroFiche = $annee
                . $provinceCode
                . 'X'
                . $numeroSequence;

            $dateNaissance = Carbon::create(
                1960 + ($i % 35),
                (($i - 1) % 12) + 1,
                (($i - 1) % 27) + 1
            );

            $dateObtention = Carbon::create($annee, 1, 15);
            $dateValidite = $dateObtention->copy()->addYears(10);

            $records[] = [
                'numero_id' => $numeroDuplicata,
                'nom' => $noms[($i - 1) % count($noms)],
                'prenom' => $prenoms[($i - 1) % count($prenoms)],
                'date_naissance' => $dateNaissance->format('Y-m-d'),
                'lieu_naissance' => $faker->city(),
                'date_obtention' => $dateObtention->format('Y-m-d'),
                'lieu_obtention' => $province,
                'categorie' => $categorie,
                'numero_permis' => $numeroDuplicata,
                'numero_origine' => $numeroFiche,
                'lieu_origine' => $province,
                'type_permis' => 'DUPLICATA',
                'date_validite' => $dateValidite->format('Y-m-d'),
                'date_renouvellement_1' => null,
                'date_renouvellement_2' => null,
                'date_renouvellement_3' => null,
                'nationalite' => 'Gabonaise',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::connection('registre')
            ->table('registre_permis')
            ->insert($records);

        $this->command->info('100 titulaires fictifs créés avec succès.');
    }
}
