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
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE dossiers ALTER COLUMN candidat_id DROP NOT NULL');
            DB::statement('ALTER TABLE dossiers ALTER COLUMN auto_ecole_id DROP NOT NULL');
            DB::statement('ALTER TABLE dossiers ALTER COLUMN formation_id DROP NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('dossiers', function (Blueprint $table) {
                // Rendre les clés étrangères nullable
                $table->uuid('candidat_id')->nullable()->change();
                $table->uuid('auto_ecole_id')->nullable()->change();
                $table->uuid('formation_id')->nullable()->change();
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
            // PostgreSQL : utiliser ALTER TABLE directement
            // Note: Cela peut échouer si des valeurs NULL existent
            DB::statement('ALTER TABLE dossiers ALTER COLUMN candidat_id SET NOT NULL');
            DB::statement('ALTER TABLE dossiers ALTER COLUMN auto_ecole_id SET NOT NULL');
            DB::statement('ALTER TABLE dossiers ALTER COLUMN formation_id SET NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('dossiers', function (Blueprint $table) {
                // Remettre les clés étrangères en non-nullable
                // Note: Cela peut échouer si des valeurs NULL existent
                $table->uuid('candidat_id')->nullable(false)->change();
                $table->uuid('auto_ecole_id')->nullable(false)->change();
                $table->uuid('formation_id')->nullable(false)->change();
            });
        }
    }
};
