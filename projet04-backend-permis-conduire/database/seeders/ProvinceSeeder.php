<?php

namespace Database\Seeders;

use App\Models\Referentiel;
use Illuminate\Database\Seeder;

class ProvinceSeeder extends Seeder
{
    protected array $provinces = [
        ['libelle' => 'Estuaire', 'code' => 'G1', 'type_ref' => 'province'],
        ['libelle' => 'Haut-Ogooué', 'code' => 'G2', 'type_ref' => 'province'],
        ['libelle' => 'Moyen-Ogooué', 'code' => 'G3', 'type_ref' => 'province'],
        ['libelle' => 'Ngounié', 'code' => 'G4', 'type_ref' => 'province'],
        ['libelle' => 'Nyanga', 'code' => 'G5', 'type_ref' => 'province'],
        ['libelle' => 'Ogooué-Ivindo', 'code' => 'G6', 'type_ref' => 'province'],
        ['libelle' => 'Ogooué-Lolo', 'code' => 'G7', 'type_ref' => 'province'],
        ['libelle' => 'Ogooué-Maritime', 'code' => 'G8', 'type_ref' => 'province'],
        ['libelle' => 'Woleu-Ntem', 'code' => 'G9', 'type_ref' => 'province'],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach ($this->provinces as $province) {
            Referentiel::updateOrCreate(
                ['code' => $province['code']],
                [
                    'libelle' => $province['libelle'],
                    'type_ref' => $province['type_ref'],
                    'description' => null,
                    'statut' => true,
                    'montant' => null,
                    'type_demande' => null,
                    'type_permis' => null,
                    'parent_id' => null,
                ]
            );
        }

        $this->command->info('Provinces insérées ou mises à jour : ' . count($this->provinces));
    }
}
