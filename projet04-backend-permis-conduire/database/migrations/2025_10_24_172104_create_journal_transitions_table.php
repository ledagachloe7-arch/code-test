<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('journal_transitions', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('transition_id')->nullable()->references('id')
                ->on('transitions')
                ->nullOnDelete();

            $table->foreignUuid('circuit_id') -> references('id') ->on('circuits')
                ->cascadeOnDelete();

            $table->string('circuit_libelle');
            $table->timestamp('date_heure');
            $table->string('auteur');
            $table->string('transition_libelle');
            $table->string('commentaire');
            $table->string('resultat');
            $table->string('statut_depart');
            $table->string('statut_cible');
            $table->string('transition_code');
            $table->timestamps();

            $table->index(['circuit_libelle', 'date_heure']);
            $table->index('transition_code');
            $table->index('resultat');
        });

        // Ajouter la contrainte CHECK pour PostgreSQL
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE journal_transitions ADD CONSTRAINT journal_transitions_resultat_check CHECK (resultat IN ('echec', 'success'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_transitions');
    }
};
