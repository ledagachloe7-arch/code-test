<?php

namespace Database\Seeders;

use App\Models\AutoEcole;
use App\Models\Personne;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AutoEcoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Récupérer les responsables d'auto-école
            $responsables = Personne::whereHas('utilisateur', function ($query) {
                $query->where('role', 'responsable_auto_ecole');
            })->get();

            if ($responsables->isEmpty()) {
                $this->command->warn('⚠️ Aucun responsable d\'auto-école trouvé. Exécutez d\'abord UtilisateurSeeder.');
                return;
            }

            $autoEcoles = [
                [
                    'nom_auto_ecole' => 'Auto-École Excellence',
                    'adresse' => '123 Avenue des Champs-Élysées, 75008 Paris',
                    'email' => 'contact@excellence-auto.com',
                    'contact' => '0612345678',
                    'statut' => true,
                    'responsable_email' => 'responsable@excellence-auto.com'
                ],
                [
                    'nom_auto_ecole' => 'Rapide Conduite',
                    'adresse' => '45 Rue de la République, 69001 Lyon',
                    'email' => 'contact@rapide-conduite.com',
                    'contact' => '0698765432',
                    'statut' => true,
                    'responsable_email' => 'gerant@rapide-conduite.com'
                ],
                [
                    'nom_auto_ecole' => 'Permis Plus',
                    'adresse' => '78 Boulevard Saint-Germain, 13001 Marseille',
                    'email' => 'contact@permis-plus.com',
                    'contact' => '0645678901',
                    'statut' => true,
                    'responsable_email' => 'directeur@permis-plus.com'
                ],
                [
                    'nom_auto_ecole' => 'Auto-École Toulouse Centre',
                    'adresse' => '12 Place du Capitole, 31000 Toulouse',
                    'email' => 'contact@auto-ecole-toulouse.com',
                    'contact' => '0654321098',
                    'statut' => true,
                    'responsable_email' => 'manager@auto-ecole-toulouse.com'
                ],
                [
                    'nom_auto_ecole' => 'Permis Nice Côte d\'Azur',
                    'adresse' => '34 Promenade des Anglais, 06000 Nice',
                    'email' => 'contact@permis-nice.com',
                    'contact' => '0678901234',
                    'statut' => true,
                    'responsable_email' => 'chef@permis-nice.com'
                ],
                [
                    'nom_auto_ecole' => 'Auto-École Bordeaux',
                    'adresse' => '56 Cours de l\'Intendance, 33000 Bordeaux',
                    'email' => 'contact@auto-ecole-bordeaux.com',
                    'contact' => '0611111111',
                    'statut' => true,
                    'responsable_email' => 'responsable@excellence-auto.com' // Utilise le premier responsable
                ],
                [
                    'nom_auto_ecole' => 'Conduite Facile Lille',
                    'adresse' => '23 Place Rihour, 59000 Lille',
                    'email' => 'contact@conduite-facile-lille.com',
                    'contact' => '0622222222',
                    'statut' => true,
                    'responsable_email' => 'gerant@rapide-conduite.com' // Utilise le deuxième responsable
                ],
                [
                    'nom_auto_ecole' => 'Auto-École Strasbourg',
                    'adresse' => '89 Grand Rue, 67000 Strasbourg',
                    'email' => 'contact@auto-ecole-strasbourg.com',
                    'contact' => '0633333333',
                    'statut' => true,
                    'responsable_email' => 'directeur@permis-plus.com' // Utilise le troisième responsable
                ],
                [
                    'nom_auto_ecole' => 'Permis Montpellier',
                    'adresse' => '45 Rue de la République, 34000 Montpellier',
                    'email' => 'contact@permis-montpellier.com',
                    'contact' => '0644444444',
                    'statut' => true,
                    'responsable_email' => 'manager@auto-ecole-toulouse.com' // Utilise le quatrième responsable
                ],
                [
                    'nom_auto_ecole' => 'Auto-École Nantes',
                    'adresse' => '67 Cours des 50 Otages, 44000 Nantes',
                    'email' => 'contact@auto-ecole-nantes.com',
                    'contact' => '0655555555',
                    'statut' => true,
                    'responsable_email' => 'chef@permis-nice.com' // Utilise le cinquième responsable
                ],
                [
                    'nom_auto_ecole' => 'Conduite Pro Rennes',
                    'adresse' => '12 Place de la République, 35000 Rennes',
                    'email' => 'contact@conduite-pro-rennes.com',
                    'contact' => '0666666666',
                    'statut' => true,
                    'responsable_email' => 'responsable@excellence-auto.com'
                ],
                [
                    'nom_auto_ecole' => 'Auto-École Tours',
                    'adresse' => '34 Rue Nationale, 37000 Tours',
                    'email' => 'contact@auto-ecole-tours.com',
                    'contact' => '0677777777',
                    'statut' => true,
                    'responsable_email' => 'gerant@rapide-conduite.com'
                ],
                [
                    'nom_auto_ecole' => 'Permis Orléans',
                    'adresse' => '78 Place du Martroi, 45000 Orléans',
                    'email' => 'contact@permis-orleans.com',
                    'contact' => '0688888888',
                    'statut' => true,
                    'responsable_email' => 'directeur@permis-plus.com'
                ],
                [
                    'nom_auto_ecole' => 'Auto-École Reims',
                    'adresse' => '23 Place Drouet d\'Erlon, 51100 Reims',
                    'email' => 'contact@auto-ecole-reims.com',
                    'contact' => '0699999999',
                    'statut' => true,
                    'responsable_email' => 'manager@auto-ecole-toulouse.com'
                ],
                [
                    'nom_auto_ecole' => 'Conduite Express Metz',
                    'adresse' => '45 Place d\'Armes, 57000 Metz',
                    'email' => 'contact@conduite-express-metz.com',
                    'contact' => '0600000000',
                    'statut' => true,
                    'responsable_email' => 'chef@permis-nice.com'
                ]
            ];

            $createdCount = 0;

            foreach ($autoEcoles as $autoEcoleData) {
                try {
                    // Vérifier si l'auto-école existe déjà
                    $existingAutoEcole = AutoEcole::where('email', $autoEcoleData['email'])->first();
                    if ($existingAutoEcole) {
                        $this->command->warn("⚠️ Auto-école {$autoEcoleData['email']} existe déjà");
                        continue;
                    }

                    // Trouver le responsable
                    $responsable = $responsables->where('email', $autoEcoleData['responsable_email'])->first();
                    if (!$responsable) {
                        // Si le responsable spécifique n'existe pas, prendre le premier disponible
                        $responsable = $responsables->first();
                        $this->command->warn("⚠️ Responsable {$autoEcoleData['responsable_email']} non trouvé, utilisation de {$responsable->email}");
                    }

                    // Créer l'auto-école
                    AutoEcole::create([
                        'nom_auto_ecole' => $autoEcoleData['nom_auto_ecole'],
                        'adresse' => $autoEcoleData['adresse'],
                        'email' => $autoEcoleData['email'],
                        'responsable_id' => $responsable->id,
                        'contact' => $autoEcoleData['contact'],
                        'statut' => $autoEcoleData['statut'],
                    ]);

                    $createdCount++;
                    $this->command->info("✅ Auto-école créée : {$autoEcoleData['nom_auto_ecole']}");

                } catch (\Exception $e) {
                    $this->command->error("❌ Erreur création auto-école {$autoEcoleData['nom_auto_ecole']}: " . $e->getMessage());
                }
            }

            $this->command->info("🎉 Auto-écoles créées : {$createdCount}");
        });
    }
}