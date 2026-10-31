<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habilitations_etapes', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // FK vers la table etapes
            $table->foreignUuid('etape_id')
                ->constrained('etapes')
                ->cascadeOnDelete();

            // FK vers roles.code (string)
            $table->string('role_code');
            $table->foreign('role_code')
                ->references('code')
                ->on('roles')
                ->restrictOnDelete();

            $table->boolean('peut_lire')->default(true);
            $table->boolean('peut_valider')->default(false);
            $table->boolean('peut_rejeter')->default(false);
            $table->boolean('peut_modifier_pieces')->default(false);

            $table->timestamps();

            // Un rôle par étape
            $table->unique(['etape_id', 'role_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('habilitations_etapes');
    }
};
