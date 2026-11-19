<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Informatisation des anciens permis roses.
 * - anciens_permis : lignes importées du registre Excel (copie fidèle + lecture de l'ancien numéro).
 * - numeros_permis_attribues : registre des nouveaux numéros générés (index unique = aucun doublon possible).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anciens_permis', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Traçabilité de l'import
            $table->string('lot_import', 40)->index();
            $table->string('fichier_source')->nullable();
            $table->unsignedInteger('ligne_excel')->nullable();
            $table->json('donnees_brutes')->nullable();

            // Ancien numéro (tel que saisi dans Excel) et sa lecture
            $table->string('ancien_numero', 100);
            $table->string('ancien_numero_normalise', 100)->index();
            $table->unsignedTinyInteger('province_code')->nullable();
            $table->unsignedSmallInteger('annee')->nullable();
            $table->string('ancien_ordre', 30)->nullable();
            $table->string('ancien_lettres', 30)->nullable();

            // Usager
            $table->string('nom', 100)->nullable();
            $table->string('prenom', 100)->nullable();
            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance', 100)->nullable();
            $table->string('categories', 50)->nullable(); // ex. "B" ou "B,C"
            $table->date('date_obtention')->nullable();
            $table->date('date_validite')->nullable();

            // A_INFORMATISER | INFORMATISE | ANOMALIE
            $table->string('statut', 20)->default('A_INFORMATISER')->index();
            $table->text('anomalies')->nullable();

            // Résultat de l'informatisation
            $table->json('nouveaux_numeros')->nullable();
            $table->string('numero_identite', 20)->nullable();
            $table->uuid('informatise_par')->nullable();
            $table->string('informatise_par_email')->nullable();
            $table->timestamp('informatise_le')->nullable();

            $table->timestamps();
        });

        Schema::create('numeros_permis_attribues', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero', 30)->unique(); // forme normalisée, ex. 19831B00001
            $table->unsignedSmallInteger('annee');
            $table->unsignedTinyInteger('province_code');
            $table->string('categorie', 5);
            $table->unsignedInteger('ordre');
            $table->uuid('ancien_permis_id')->nullable()->index();
            $table->uuid('h_permis_id')->nullable();
            $table->uuid('attribue_par')->nullable();
            $table->timestamps();

            $table->unique(['annee', 'province_code', 'categorie', 'ordre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('numeros_permis_attribues');
        Schema::dropIfExists('anciens_permis');
    }
};
