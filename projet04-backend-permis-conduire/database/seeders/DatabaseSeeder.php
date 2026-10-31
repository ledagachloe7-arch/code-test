<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->command->info('🚀 Début du seeding de la base de données...');
        
        // Ordre important : les seeders doivent être exécutés dans cet ordre
        // pour respecter les contraintes de clés étrangères
        
        $this->command->info('📋 1. Création des référentiels...');
        $this->call(ReferentielSeeder::class);
        
        $this->command->info('📌 1b. Création des status (parcours permis)...');
        $this->call(StatusSeeder::class);
        
        $this->command->info('📄 2. Création des pièces justificatives...');
        $this->call(PieceJustificativeSeeder::class);
        
        $this->command->info('👤 3. Création des utilisateurs et personnes...');
        $this->call(UtilisateurSeeder::class);
        
        $this->command->info('👨‍💼 4. Création des administrateurs...');
        $this->call(AdministrateurSeeder::class);
        
        $this->command->info('🏫 5. Création des auto-écoles...');
        $this->call(AutoEcoleSeeder::class);
        
        $this->command->info('🎓 6. Création des candidats...');
        $this->call(CandidatSeeder::class);
        
        $this->command->info('📚 7. Création des formations...');
        $this->call(FormationSeeder::class);
        
        $this->command->info('📁 8. Création des dossiers...');
        $this->call(DossierSeeder::class);
        
        $this->command->info('📄 9. Création des documents...');
        $this->call(DocumentSeeder::class);
        
        $this->command->info('🎉 Seeding terminé avec succès !');
        $this->command->info('');
        $this->command->info('📊 Résumé des données créées :');
        $this->command->info('   - Référentiels : Types de permis, sessions, documents, etc.');
        $this->command->info('   - Utilisateurs : 2 admins, 5 responsables, 15 candidats');
        $this->command->info('   - Auto-écoles : 15 établissements');
        $this->command->info('   - Candidats : 15 profils complets');
        $this->command->info('   - Formations : Plusieurs formations par auto-école');
        $this->command->info('   - Dossiers : Liaisons candidat ↔ auto-école ↔ formation');
        $this->command->info('   - Documents : Fichiers associés aux dossiers');
        $this->command->info('');
        $this->command->info('🔐 Comptes de test créés :');
        $this->command->info('   - Admin : admin@autoecole-system.com / Admin123!');
        $this->command->info('   - Responsable : responsable@excellence-auto.com / Responsable123!');
        $this->command->info('   - Candidat : candidat1@email.com / Candidat123!');
    }
}
