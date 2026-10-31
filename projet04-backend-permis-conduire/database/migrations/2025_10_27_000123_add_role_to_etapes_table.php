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
        Schema::table('etapes', function (Blueprint $table) {
            // Vérifie si la colonne 'roles' existe, sinon on la crée
            if (!Schema::hasColumn('etapes', 'roles')) {
                $table->json('roles')->nullable()->after('libelle');
            }

            // Ajout de la colonne 'pieces' pour stocker un tableau d'objets JSON
            if (!Schema::hasColumn('etapes', 'pieces')) {
                $table->json('pieces')->nullable()->after('roles');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('etapes', function (Blueprint $table) {
            if (Schema::hasColumn('etapes', 'roles')) {
                $table->dropColumn('roles');
            }
            if (Schema::hasColumn('etapes', 'pieces')) {
                $table->dropColumn('pieces');
            }
        });
    }
};
