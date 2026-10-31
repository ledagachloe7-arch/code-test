<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Détecter le type de base de données
        $driver = DB::connection()->getDriverName();
        
        // 1. D'abord supprimer les contraintes et changer le type selon le driver
        if ($driver === 'pgsql') {
            // PostgreSQL : Supprimer la contrainte CHECK AVANT tout
            DB::statement('ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check');
            DB::statement('ALTER TABLE utilisateurs ALTER COLUMN role TYPE VARCHAR(100)');
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role SET DEFAULT 'ROLE_CANDIDAT'");
            DB::statement('ALTER TABLE utilisateurs ALTER COLUMN role DROP NOT NULL');
        } else {
            // MySQL/MariaDB : Changer le type AVANT les updates
            DB::statement("ALTER TABLE utilisateurs MODIFY COLUMN role VARCHAR(100) DEFAULT 'ROLE_CANDIDAT' NULL");
        }
        
        // 2. Mettre à jour les anciennes valeurs (maintenant que le type est ouvert)
        DB::statement("UPDATE utilisateurs SET role = 'ROLE_CANDIDAT' WHERE role = 'candidat'");
        DB::statement("UPDATE utilisateurs SET role = 'ROLE_ADMIN' WHERE role = 'admin'");
        DB::statement("UPDATE utilisateurs SET role = 'ROLE_RESPONSABLE_AUTO_ECOLE' WHERE role = 'responsable_auto_ecole'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Détecter le type de base de données
        $driver = DB::connection()->getDriverName();
        
        // Revenir aux anciennes valeurs
        DB::statement("UPDATE utilisateurs SET role = 'candidat' WHERE role = 'ROLE_CANDIDAT'");
        DB::statement("UPDATE utilisateurs SET role = 'admin' WHERE role = 'ROLE_ADMIN'");
        DB::statement("UPDATE utilisateurs SET role = 'responsable_auto_ecole' WHERE role = 'ROLE_RESPONSABLE_AUTO_ECOLE'");
        
        // Recréer l'enum selon le driver
        if ($driver === 'pgsql') {
            // PostgreSQL
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role TYPE VARCHAR(100)");
            DB::statement("ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check CHECK (role IN ('admin', 'responsable_auto_ecole', 'candidat'))");
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role SET DEFAULT 'candidat'");
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role SET NOT NULL");
        } else {
            // MySQL/MariaDB
            DB::statement("ALTER TABLE utilisateurs MODIFY COLUMN role ENUM('admin', 'responsable_auto_ecole', 'candidat') DEFAULT 'candidat' NOT NULL");
        }
    }
};
