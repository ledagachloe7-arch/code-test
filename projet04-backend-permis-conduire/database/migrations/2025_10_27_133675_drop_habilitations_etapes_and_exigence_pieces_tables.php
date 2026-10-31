<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Supprime les tables.
     */
    public function up(): void
    {
        // Supprime d'abord les contraintes si nécessaire (Postgres le demande)
        if (Schema::hasTable('habilitations_etapes')) {
            Schema::table('habilitations_etapes', function (Blueprint $table) {
                $table->dropForeign(['etape_id']);
                $table->dropForeign(['role_code']);
            });
            Schema::dropIfExists('habilitations_etapes');
        }

        if (Schema::hasTable('exigence_pieces')) {
            Schema::table('exigence_pieces', function (Blueprint $table) {
                $table->dropForeign(['etape_id']);
            });
            Schema::dropIfExists('exigence_pieces');
        }
    }

    /**
     * Recréation des tables si rollback.
     */
    public function down(): void
    {
        Schema::create('habilitations_etapes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('etape_id')->constrained('etapes')->cascadeOnDelete();
            $table->string('role_code');
            $table->foreign('role_code')->references('code')->on('roles')->restrictOnDelete();
            $table->boolean('peut_lire')->default(true);
            $table->boolean('peut_valider')->default(false);
            $table->boolean('peut_rejeter')->default(false);
            $table->boolean('peut_modifier_pieces')->default(false);
            $table->timestamps();
            $table->unique(['etape_id', 'role_code']);
        });

        Schema::create('exigence_pieces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('description');
            $table->integer('number_pieces_required');
            $table->integer('number_pieces_given');
            $table->boolean('exigenceSatisfaite');
            $table->timestamps();
            $table->foreignUuid('etape_id')->constrained('etapes')->cascadeOnDelete();
        });
    }
};
