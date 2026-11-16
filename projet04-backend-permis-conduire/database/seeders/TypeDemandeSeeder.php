<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TypeDemande;

class TypeDemandeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            'NOUVEAUPERMIS',
            'DUPLICATA',
            'FICHEENREGISTREMENT',
            'DUPLICATAFICHEENREGISTREMENT',
            // RENOUVELLEMENT, MISEAJOUR et CONVERSION retirés : voir TypeDemande::TYPES_RETIRES
        ];

        foreach ($types as $type) {
            TypeDemande::updateOrCreate(
                ['name' => $type],
                ['name' => $type]
            );
        }

        $this->command->info('Les 4 types de demande ont été initialisés.');
    }
}
