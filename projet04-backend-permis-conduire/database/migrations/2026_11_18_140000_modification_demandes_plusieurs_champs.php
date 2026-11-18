<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Une demande de modification peut corriger plusieurs champs du titulaire :
 * les champs passent dans modification_demande_lignes (une ligne = un champ).
 * Restructuration refusée si des demandes existent déjà.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('modification_demandes')->count() > 0) {
            throw new RuntimeException('modification_demandes contient des données : restructuration automatique refusée.');
        }

        DB::statement('DROP INDEX IF EXISTS modification_demandes_une_soumise_par_champ');
        Schema::table('modification_demandes', function (Blueprint $table) {
            $table->dropColumn(['champ', 'ancienne_valeur', 'nouvelle_valeur', 'details']);
        });

        Schema::create('modification_demande_lignes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('demande_id');
            $table->foreign('demande_id')->references('id')->on('modification_demandes')->cascadeOnDelete();
            // nom | prenom | date_naissance | lieu_naissance | nationalite
            $table->string('champ', 30);
            $table->string('ancienne_valeur')->nullable();
            $table->string('nouvelle_valeur');
            $table->json('details')->nullable(); // ex. lieu : ville, province, pays
            $table->timestamps();

            $table->unique(['demande_id', 'champ']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modification_demande_lignes');
        Schema::table('modification_demandes', function (Blueprint $table) {
            $table->string('champ', 30)->nullable();
            $table->string('ancienne_valeur')->nullable();
            $table->string('nouvelle_valeur')->nullable();
            $table->json('details')->nullable();
        });
    }
};
