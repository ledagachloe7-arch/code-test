<?php

namespace Database\Seeders;

use App\Models\Utilisateur;
use App\Services\AuthentikService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UtilisateurSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $authentikService = new AuthentikService();
            
            // Administrateurs
            $admins = [
                [
                    'email' => 'admin@autoecole-system.com',
                    'password' => 'Admin123!',
                    'role' => 'admin',
                    'nom' => 'Admin',
                    'prenom' => 'Système',
                    'telephone' => '0123456789',
                    'adresse' => '1 Rue de l\'Administration, 75001 Paris'
                ],
                [
                    'email' => 'superadmin@autoecole-system.com',
                    'password' => 'SuperAdmin123!',
                    'role' => 'admin',
                    'nom' => 'Super',
                    'prenom' => 'Admin',
                    'telephone' => '0123456790',
                    'adresse' => '2 Rue de l\'Administration, 75001 Paris'
                ]
            ];

            // Responsables d'auto-école
            $responsables = [
                [
                    'email' => 'responsable@excellence-auto.com',
                    'password' => 'Responsable123!',
                    'role' => 'responsable_auto_ecole',
                    'nom' => 'Dupont',
                    'prenom' => 'Jean',
                    'telephone' => '0612345678',
                    'adresse' => '123 Avenue des Champs-Élysées, 75008 Paris'
                ],
                [
                    'email' => 'gerant@rapide-conduite.com',
                    'password' => 'Gerant123!',
                    'role' => 'responsable_auto_ecole',
                    'nom' => 'Martin',
                    'prenom' => 'Sophie',
                    'telephone' => '0698765432',
                    'adresse' => '45 Rue de la République, 69001 Lyon'
                ],
                [
                    'email' => 'directeur@permis-plus.com',
                    'password' => 'Directeur123!',
                    'role' => 'responsable_auto_ecole',
                    'nom' => 'Bernard',
                    'prenom' => 'Pierre',
                    'telephone' => '0645678901',
                    'adresse' => '78 Boulevard Saint-Germain, 13001 Marseille'
                ],
                [
                    'email' => 'manager@auto-ecole-toulouse.com',
                    'password' => 'Manager123!',
                    'role' => 'responsable_auto_ecole',
                    'nom' => 'Durand',
                    'prenom' => 'Marie',
                    'telephone' => '0654321098',
                    'adresse' => '12 Place du Capitole, 31000 Toulouse'
                ],
                [
                    'email' => 'chef@permis-nice.com',
                    'password' => 'Chef123!',
                    'role' => 'responsable_auto_ecole',
                    'nom' => 'Moreau',
                    'prenom' => 'Claude',
                    'telephone' => '0678901234',
                    'adresse' => '34 Promenade des Anglais, 06000 Nice'
                ]
            ];

            // Candidats
            $candidats = [
                [
                    'email' => 'candidat1@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Leroy',
                    'prenom' => 'Alice',
                    'telephone' => '0611111111',
                    'adresse' => '1 Rue de la Paix, 75001 Paris'
                ],
                [
                    'email' => 'candidat2@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Petit',
                    'prenom' => 'Thomas',
                    'telephone' => '0622222222',
                    'adresse' => '2 Rue de Rivoli, 75001 Paris'
                ],
                [
                    'email' => 'candidat3@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Rousseau',
                    'prenom' => 'Emma',
                    'telephone' => '0633333333',
                    'adresse' => '3 Avenue des Champs-Élysées, 75008 Paris'
                ],
                [
                    'email' => 'candidat4@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Simon',
                    'prenom' => 'Lucas',
                    'telephone' => '0644444444',
                    'adresse' => '4 Rue de la République, 69001 Lyon'
                ],
                [
                    'email' => 'candidat5@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Laurent',
                    'prenom' => 'Chloé',
                    'telephone' => '0655555555',
                    'adresse' => '5 Boulevard Saint-Germain, 13001 Marseille'
                ],
                [
                    'email' => 'candidat6@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Michel',
                    'prenom' => 'Hugo',
                    'telephone' => '0666666666',
                    'adresse' => '6 Place du Capitole, 31000 Toulouse'
                ],
                [
                    'email' => 'candidat7@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Garcia',
                    'prenom' => 'Léa',
                    'telephone' => '0677777777',
                    'adresse' => '7 Promenade des Anglais, 06000 Nice'
                ],
                [
                    'email' => 'candidat8@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'David',
                    'prenom' => 'Nathan',
                    'telephone' => '0688888888',
                    'adresse' => '8 Rue de la Paix, 75001 Paris'
                ],
                [
                    'email' => 'candidat9@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Robert',
                    'prenom' => 'Manon',
                    'telephone' => '0699999999',
                    'adresse' => '9 Rue de Rivoli, 75001 Paris'
                ],
                [
                    'email' => 'candidat10@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Richard',
                    'prenom' => 'Ethan',
                    'telephone' => '0600000000',
                    'adresse' => '10 Avenue des Champs-Élysées, 75008 Paris'
                ],
                [
                    'email' => 'candidat11@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Thomas',
                    'prenom' => 'Zoé',
                    'telephone' => '0611123456',
                    'adresse' => '11 Rue de la République, 69001 Lyon'
                ],
                [
                    'email' => 'candidat12@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Petit',
                    'prenom' => 'Maxime',
                    'telephone' => '0623456789',
                    'adresse' => '12 Boulevard Saint-Germain, 13001 Marseille'
                ],
                [
                    'email' => 'candidat13@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Durand',
                    'prenom' => 'Camille',
                    'telephone' => '0634567890',
                    'adresse' => '13 Place du Capitole, 31000 Toulouse'
                ],
                [
                    'email' => 'candidat14@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Leroy',
                    'prenom' => 'Alexandre',
                    'telephone' => '0614456789',
                    'adresse' => '14 Promenade des Anglais, 06000 Nice'
                ],
                [
                    'email' => 'candidat15@email.com',
                    'password' => 'Candidat123!',
                    'role' => 'candidat',
                    'nom' => 'Moreau',
                    'prenom' => 'Sarah',
                    'telephone' => '0656789012',
                    'adresse' => '15 Rue de la Paix, 75001 Paris'
                ]
            ];

            $allUsers = array_merge($admins, $responsables, $candidats);
            $createdCount = 0;
            $authentikCount = 0;
            $skippedCount = 0;
            $errorCount = 0;

            // Vérifier l'unicité des emails et téléphones dans les données du seeder
            $emails = [];
            $telephones = [];
            foreach ($allUsers as $index => $userData) {
                $email = $userData['email'] ?? null;
                $telephone = $userData['telephone'] ?? null;
                
                if ($email && isset($emails[$email])) {
                    $this->command->error("❌ Email dupliqué dans les données du seeder : {$email} (index {$index} et {$emails[$email]})");
                }
                if ($telephone && isset($telephones[$telephone])) {
                    $this->command->error("❌ Téléphone dupliqué dans les données du seeder : {$telephone} (index {$index} et {$telephones[$telephone]})");
                }
                
                if ($email) $emails[$email] = $index;
                if ($telephone) $telephones[$telephone] = $index;
            }

            foreach ($allUsers as $userData) {
                try {
                    // Vérifier si l'utilisateur existe déjà (par email OU téléphone)
                    $existingByEmail = null;
                    $existingByTelephone = null;
                    
                    if (!empty($userData['email'])) {
                        $existingByEmail = Utilisateur::where('email', $userData['email'])->first();
                    }
                    
                    if (!empty($userData['telephone'])) {
                        $existingByTelephone = Utilisateur::where('telephone', $userData['telephone'])->first();
                    }
                    
                    if ($existingByEmail || $existingByTelephone) {
                        $skippedCount++;
                        $reason = [];
                        if ($existingByEmail) $reason[] = "email ({$userData['email']})";
                        if ($existingByTelephone) $reason[] = "téléphone ({$userData['telephone']})";
                        $this->command->warn("⚠️ Utilisateur existe déjà par " . implode(' ou ', $reason) . " - ignoré");
                        continue;
                    }

                    // Créer l'utilisateur dans Authentik
                    $authentikUser = null;
                    try {
                        $authentikUser = $authentikService->createUser($userData);
                        if ($authentikUser) {
                            $authentikCount++;
                            $this->command->info("✅ Utilisateur créé dans Authentik : {$userData['email']} (ID: {$authentikUser['pk']})");
                        } else {
                            $this->command->warn("⚠️ Authentik a retourné null pour {$userData['email']} (mode local uniquement)");
                        }
                    } catch (\Exception $e) {
                        $this->command->warn("⚠️ Erreur Authentik pour {$userData['email']}: " . $e->getMessage());
                        // Continuer même si Authentik échoue
                    }

                    // Créer l'utilisateur local (table utilisateurs : email, telephone, password, role)
                    // On sort de la transaction pour éviter le rollback si Authentik a réussi
                    DB::beginTransaction();
                    try {
                        $utilisateur = Utilisateur::create([
                            'email' => $userData['email'],
                            'telephone' => $userData['telephone'],
                            'password' => Hash::make($userData['password']),
                            'role' => $userData['role'],
                        ]);

                        // Créer la personne associée (table personnes : nom, prenom, email, contact, adresse)
                        $utilisateur->personne()->create([
                            'nom' => $userData['nom'],
                            'prenom' => $userData['prenom'],
                            'email' => $userData['email'],
                            'contact' => $userData['telephone'],
                            'adresse' => $userData['adresse'],
                        ]);

                        DB::commit();
                        $createdCount++;
                        $this->command->info("✅ Utilisateur local créé : {$userData['email']} ({$userData['role']}) - ID: {$utilisateur->id}");
                    } catch (\Exception $e) {
                        DB::rollBack();
                        $errorCount++;
                        $this->command->error("❌ Erreur création utilisateur local {$userData['email']}: " . $e->getMessage());
                        $this->command->error("   Détails: " . $e->getFile() . ":" . $e->getLine());
                        Log::error('Erreur seeder utilisateur local', [
                            'email' => $userData['email'],
                            'telephone' => $userData['telephone'],
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                    }

                } catch (\Exception $e) {
                    $errorCount++;
                    $this->command->error("❌ Erreur générale création utilisateur {$userData['email']}: " . $e->getMessage());
                    Log::error('Erreur seeder utilisateur', [
                        'email' => $userData['email'],
                        'telephone' => $userData['telephone'],
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }

            $this->command->info("🎉 Seeders terminés :");
            $this->command->info("   - Utilisateurs locaux créés : {$createdCount}");
            $this->command->info("   - Utilisateurs Authentik créés : {$authentikCount}");
            $this->command->info("   - Utilisateurs ignorés (déjà existants) : {$skippedCount}");
            $this->command->info("   - Erreurs : {$errorCount}");
            $this->command->info("   - Administrateurs : " . count($admins));
            $this->command->info("   - Responsables auto-école : " . count($responsables));
            $this->command->info("   - Candidats : " . count($candidats));
            
            // Vérification finale
            $totalInDb = Utilisateur::count();
            $this->command->info("");
            $this->command->info("📊 Vérification finale :");
            $this->command->info("   - Total utilisateurs dans la base de données : {$totalInDb}");
            
            if ($createdCount > 0 && $totalInDb < $createdCount) {
                $this->command->warn("⚠️ ATTENTION : {$createdCount} utilisateurs devraient être créés mais seulement {$totalInDb} sont dans la base !");
            }
    }
}