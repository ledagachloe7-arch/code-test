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
            'RENOUVELLEMENT',
            'CONVERSION',
        ];

        foreach ($types as $type) {
            TypeDemande::updateOrCreate(
                ['name' => $type],
                ['name' => $type]
            );
        }

        $this->command->info('Les 6 types de demande ont été initialisés.');
    }
}
