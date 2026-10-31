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
        Schema::table('dossiers', function (Blueprint $table) {
            // Ajouter la clé étrangère type_demande_id (nullable)
            $table->foreignUuid('type_demande_id')
                ->nullable()
                ->after('formation_id')
                ->constrained('type_demandes')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            // Supprimer la clé étrangère
            $table->dropForeign(['type_demande_id']);
            $table->dropColumn('type_demande_id');
        });
    }
};
