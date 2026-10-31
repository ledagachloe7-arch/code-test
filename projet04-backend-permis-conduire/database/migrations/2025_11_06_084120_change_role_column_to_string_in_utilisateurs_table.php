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
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : supprimer la contrainte CHECK si elle existe, puis modifier la colonne
            DB::statement('ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check');
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role TYPE VARCHAR(255)");
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role SET DEFAULT 'ROLE_CANDIDAT'");
            DB::statement('ALTER TABLE utilisateurs ALTER COLUMN role DROP NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('utilisateurs', function (Blueprint $table) {
                // Changer le type de la colonne role de enum vers string
                // pour permettre d'autres types de rôles
                $table->string('role')->default('ROLE_CANDIDAT')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : recréer la contrainte CHECK
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role TYPE VARCHAR(255)");
            DB::statement("ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check CHECK (role IN ('admin', 'responsable_auto_ecole', 'ROLE_CANDIDAT'))");
            DB::statement("ALTER TABLE utilisateurs ALTER COLUMN role SET DEFAULT 'ROLE_CANDIDAT'");
            DB::statement('ALTER TABLE utilisateurs ALTER COLUMN role SET NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('utilisateurs', function (Blueprint $table) {
                // Revenir à l'enum avec les 3 valeurs de base
                $table->enum('role', ['admin', 'responsable_auto_ecole', 'ROLE_CANDIDAT'])->default('ROLE_CANDIDAT')->change();
            });
        }
    }
};
