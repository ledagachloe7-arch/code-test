<?php

namespace Database\Seeders;

use App\Models\Administrateur;
use App\Models\Personne;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdministrateurSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Récupérer les personnes avec le rôle admin
            $personnesAdmins = Personne::whereHas('utilisateur', function ($query) {
                $query->where('role', 'admin');
            })->get();

            if ($personnesAdmins->isEmpty()) {
                $this->command->warn('⚠️ Aucune personne admin trouvée. Exécutez d\'abord UtilisateurSeeder.');
                return;
            }

            $createdCount = 0;

            foreach ($personnesAdmins as $personne) {
                try {
                    // Vérifier si l'administrateur existe déjà
                    $existingAdmin = Administrateur::where('personne_id', $personne->id)->first();
                    if ($existingAdmin) {
                        $this->command->warn("⚠️ Administrateur {$personne->prenom} {$personne->nom} existe déjà");
                        continue;
                    }

                    // Créer l'administrateur
                    Administrateur::create([
                        'personne_id' => $personne->id,
                    ]);

                    $createdCount++;
                    $this->command->info("✅ Administrateur créé : {$personne->prenom} {$personne->nom} ({$personne->email})");

                } catch (\Exception $e) {
                    $this->command->error("❌ Erreur création administrateur {$personne->prenom} {$personne->nom}: " . $e->getMessage());
                }
            }

            $this->command->info("🎉 Administrateurs créés : {$createdCount}");
        });
    }
}