<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pieces_justificatives', function (Blueprint $table) {
            // Supprimer les contraintes étrangères si elles existent
            if (Schema::hasColumn('pieces_justificatives', 'inscription_id')) {
                $table->dropForeign(['inscription_id']);
                $table->dropColumn('inscription_id');
            }

            if (Schema::hasColumn('pieces_justificatives', 'type_permis_id')) {
                $table->dropForeign(['type_permis_id']);
                $table->dropColumn('type_permis_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pieces_justificatives', function (Blueprint $table) {
            // Ajouter les colonnes supprimées avec leurs contraintes
            $table->foreignUuid('inscription_id')
                  ->nullable()
                  ->constrained('referentiels')
                  ->nullOnDelete();

            $table->foreignUuid('type_permis_id')
                  ->nullable()
                  ->constrained('referentiels')
                  ->nullOnDelete();
        });
    }
};
