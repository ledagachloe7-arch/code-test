<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Exécuter la migration.
     */
    public function up(): void
    {
        Schema::table('circuits', function (Blueprint $table) {
            if (!Schema::hasColumn('circuits', 'nom_entite')) {
                $table->string('nom_entite')->nullable()->after('actif');
            }
        });
    }

    /**
     * Annuler la migration.
     */
    public function down(): void
    {
        Schema::table('circuits', function (Blueprint $table) {
            if (Schema::hasColumn('circuits', 'nom_entite')) {
                $table->dropColumn('nom_entite');
            }
        });
    }
};
