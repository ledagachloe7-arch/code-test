<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Renouvellement par titulaire : un renouvellement (un paiement) couvre toutes les
 * catégories expirées du titulaire ; le détail par catégorie est dans renouvellement_categories.
 *
 * Remplace la structure « une ligne = une catégorie » de 2026_11_17_100000 (table encore vide).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('renouvellements') && DB::table('renouvellements')->count() > 0) {
            throw new RuntimeException('La table renouvellements contient des données : restructuration automatique refusée.');
        }
        Schema::dropIfExists('renouvellements');

        Schema::create('renouvellements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero', 30)->unique();

            // Titulaire (h_permis.numero_identite) — copie des informations au moment de la demande
            $table->string('numero_identite', 20)->index();
            $table->string('nom', 50);
            $table->string('prenom', 50)->nullable();
            $table->date('date_naissance')->nullable();

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
            $table->date('nouvelle_date_delivrance')->nullable();

            // Traçabilité
            $table->uuid('agent_id')->nullable();
            $table->string('agent_email')->nullable();

            $table->timestamps();
        });

        // Une seule demande en attente de paiement à la fois par titulaire.
        DB::statement(
            "CREATE UNIQUE INDEX renouvellements_un_en_attente_par_titulaire
             ON renouvellements (numero_identite)
             WHERE statut = 'EN_ATTENTE_PAIEMENT'"
        );

        Schema::create('renouvellement_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('renouvellement_id');
            $table->foreign('renouvellement_id')->references('id')->on('renouvellements')->cascadeOnDelete();
            $table->uuid('h_permis_id');
            $table->foreign('h_permis_id')->references('id')->on('h_permis')->restrictOnDelete();
            $table->string('numero_permis', 200)->nullable();
            $table->string('categorie', 10);
            // Copie du statut du renouvellement (sert aux index uniques partiels)
            $table->string('statut', 30)->default('EN_ATTENTE_PAIEMENT');

            $table->date('ancienne_date_expiration');
            $table->date('nouvelle_date_delivrance')->nullable();
            $table->date('nouvelle_date_expiration')->nullable();
            $table->unsignedSmallInteger('duree_validite_annees')->nullable();
            $table->unsignedSmallInteger('age_au_renouvellement')->nullable();

            $table->timestamps();
        });

        // Une catégorie ne peut être renouvelée qu'une fois par échéance (notification répétée = sans effet).
        DB::statement(
            "CREATE UNIQUE INDEX renouv_cat_un_confirme_par_echeance
             ON renouvellement_categories (h_permis_id, ancienne_date_expiration)
             WHERE statut = 'CONFIRME'"
        );
        // Une catégorie ne peut figurer que dans une seule demande en attente.
        DB::statement(
            "CREATE UNIQUE INDEX renouv_cat_un_en_attente
             ON renouvellement_categories (h_permis_id)
             WHERE statut = 'EN_ATTENTE_PAIEMENT'"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('renouvellement_categories');
        Schema::dropIfExists('renouvellements');
    }
};
