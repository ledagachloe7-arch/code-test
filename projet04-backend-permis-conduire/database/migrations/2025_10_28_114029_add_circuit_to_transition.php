<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transitions', function (Blueprint $table) {
            // Ajouter circuit_id après cible_etape_id si la colonne n'existe pas
            if (!Schema::hasColumn('transitions', 'circuit_id')) {
                $table->uuid('circuit_id')->nullable()->after('cible_etape_id');

                // Définir la clé étrangère
                $table->foreign('circuit_id')
                    ->references('id')
                    ->on('circuits')
                    ->onDelete('cascade');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transitions', function (Blueprint $table) {
            if (Schema::hasColumn('transitions', 'circuit_id')) {
                $table->dropForeign(['circuit_id']);
                $table->dropColumn('circuit_id');
            }
        });
    }
};
