<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Demandes de modification des informations personnelles d'un titulaire de permis.
 * Une demande = un champ modifié. Elle sert aussi d'historique (ancienne/nouvelle valeur, décision).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modification_demandes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero', 30)->unique();

            // Titulaire (h_permis.numero_identite) + copie au moment de la demande
            $table->string('numero_identite', 20)->index();
            $table->string('numero_permis', 200)->nullable();
            $table->string('nom_titulaire', 50);
            $table->string('prenom_titulaire', 50)->nullable();

            // nom | prenom | date_naissance | lieu_naissance | nationalite
            $table->string('champ', 30);
            $table->string('ancienne_valeur')->nullable();
            $table->string('nouvelle_valeur');
            $table->json('details')->nullable(); // ex. lieu : ville, province, pays

            $table->text('motif');
            $table->string('justificatif_path')->nullable();
            $table->string('justificatif_nom')->nullable();
            $table->string('justificatif_mime', 100)->nullable();

            // BROUILLON | SOUMISE | APPROUVEE | REJETEE
            $table->string('statut', 20)->default('BROUILLON')->index();

            $table->uuid('demandeur_id')->nullable();
            $table->string('demandeur_email')->nullable();
            $table->timestamp('date_soumission')->nullable();

            $table->uuid('validateur_id')->nullable();
            $table->string('validateur_email')->nullable();
            $table->timestamp('date_decision')->nullable();
            $table->text('motif_decision')->nullable();
            $table->timestamp('date_application')->nullable();

            $table->timestamps();
        });

        // Une seule demande soumise (en attente) à la fois par titulaire et par champ.
        DB::statement(
            "CREATE UNIQUE INDEX modification_demandes_une_soumise_par_champ
             ON modification_demandes (numero_identite, champ)
             WHERE statut = 'SOUMISE'"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('modification_demandes');
    }
};
