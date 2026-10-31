<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transitions', function (Blueprint $table) {
            // Supprimer l'index sur type si il existe
            $table->dropIndex(['type']);

            // Supprimer les colonnes
            $table->dropColumn(['type', 'condition', 'actions']);
        });

        //Ajouter le champ annulable
        Schema::table('statuts', function (Blueprint $table) {
            if (!Schema::hasColumn('statuts', 'annulable')) {
                $table->boolean('annulable')->after('id');
            }
        });
        
    }

    public function down(): void
    {
        Schema::table('transitions', function (Blueprint $table) {
            // Recréer les colonnes
            $table->string('type');
            $table->text('condition')->nullable();
            $table->json('actions')->nullable();

            // Recréer l'index sur type
            $table->index('type');
        });
    }
};
