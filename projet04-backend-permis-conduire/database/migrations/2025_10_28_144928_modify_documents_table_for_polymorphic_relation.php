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
        Schema::table('documents', function (Blueprint $table) {
            // Supprimer la contrainte de clé étrangère
            $table->dropForeign(['dossier_id']);
            // Supprimer la colonne dossier_id
            $table->dropColumn('dossier_id');
            // Ajouter les colonnes polymorphiques
            $table->morphs('documentable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Supprimer les colonnes polymorphiques
            $table->dropMorphs('documentable');
            // Réajouter la colonne dossier_id
            $table->foreignUuid('dossier_id')->constrained('dossiers')->onDelete('cascade');
        });
    }
};
