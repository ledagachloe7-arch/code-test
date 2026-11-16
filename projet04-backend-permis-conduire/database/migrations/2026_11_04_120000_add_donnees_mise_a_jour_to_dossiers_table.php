<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mise à jour (correction d'état civil) : champs corrigés avec ancienne et nouvelle valeur.
     */
    public function up(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->json('donnees_mise_a_jour')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->dropColumn('donnees_mise_a_jour');
        });
    }
};
