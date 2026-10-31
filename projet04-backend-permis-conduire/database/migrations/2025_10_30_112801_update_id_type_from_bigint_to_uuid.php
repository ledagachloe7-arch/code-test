<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Exécuter la migration.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE documents RENAME COLUMN documentable_id TO old_documentable_id');
            DB::statement('ALTER TABLE documents ADD COLUMN documentable_id UUID');
            DB::statement('ALTER TABLE documents DROP COLUMN old_documentable_id');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('documents', function (Blueprint $table) {
                // Étape 1 : renommer la colonne existante
                $table->renameColumn('documentable_id', 'old_documentable_id');
            });

            Schema::table('documents', function (Blueprint $table) {
                // Étape 2 : ajouter la nouvelle colonne UUID
                $table->uuid('documentable_id')->after('documentable_type');
            });

            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('old_documentable_id');
            });
        }
    }

    /**
     * Annuler la migration.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE documents ADD COLUMN old_documentable_id BIGINT');
            DB::statement('UPDATE documents SET old_documentable_id = NULL');
            DB::statement('ALTER TABLE documents DROP COLUMN documentable_id');
            DB::statement('ALTER TABLE documents RENAME COLUMN old_documentable_id TO documentable_id');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('documents', function (Blueprint $table) {
                // Revenir à l'ancien type bigint si besoin
                $table->bigInteger('old_documentable_id')->nullable()->after('documentable_type');
            });

            DB::statement('
                UPDATE documents
                SET old_documentable_id = NULL
            ');

            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('documentable_id');
                $table->renameColumn('old_documentable_id', 'documentable_id');
            });
        }
    }
};
