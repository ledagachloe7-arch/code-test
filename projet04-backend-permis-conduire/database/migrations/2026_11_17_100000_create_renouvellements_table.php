<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Historique des renouvellements de permis (une ligne h_permis = une catégorie).
 * Les dates sont exclusivement générées par le serveur (RenouvellementService).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('renouvellements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero', 30)->unique();

            $table->uuid('h_permis_id');
            $table->foreign('h_permis_id')->references('id')->on('h_permis')->restrictOnDelete();
            $table->string('numero_permis', 200)->nullable();
            $table->string('categorie', 10);

            // EN_ATTENTE_PAIEMENT | CONFIRME | ECHOUE | ANNULE
            $table->string('statut', 30)->default('EN_ATTENTE_PAIEMENT')->index();

            // Paiement
            $table->string('operateur', 20); // MOOV | AIRTEL
            $table->string('code_paiement', 50)->unique();
            $table->string('reference_paiement', 100)->nullable()->unique();
            $table->decimal('montant', 12, 2);
            $table->string('telephone', 30)->nullable();
            $table->timestamp('date_confirmation_paiement')->nullable();
            $table->string('motif_echec')->nullable();

            // Dates (anciennes et nouvelles)
            $table->date('ancienne_date_expiration');
            $table->date('nouvelle_date_delivrance')->nullable();
            $table->date('nouvelle_date_expiration')->nullable();
            $table->unsignedSmallInteger('duree_validite_annees')->nullable();
            $table->unsignedSmallInteger('age_au_renouvellement')->nullable();

            // Traçabilité
            $table->uuid('agent_id')->nullable();
            $table->string('agent_email')->nullable();

            $table->timestamps();
        });

        // Un seul renouvellement confirmé par permis/catégorie et par échéance
        // → une notification de paiement répétée ne peut pas créer un 2e renouvellement.
        DB::statement(
            "CREATE UNIQUE INDEX renouvellements_un_confirme_par_echeance
             ON renouvellements (h_permis_id, ancienne_date_expiration)
             WHERE statut = 'CONFIRME'"
        );

        // Une seule demande en attente de paiement à la fois par permis/catégorie.
        DB::statement(
            "CREATE UNIQUE INDEX renouvellements_un_en_attente
             ON renouvellements (h_permis_id)
             WHERE statut = 'EN_ATTENTE_PAIEMENT'"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('renouvellements');
    }
};
