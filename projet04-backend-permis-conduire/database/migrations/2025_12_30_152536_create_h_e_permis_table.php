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
        Schema::create('h_e_permis', function (Blueprint $table) {
             $table->string('numero_identite')->nullable();
            $table->string('nom'); // Obligatoire
            $table->string('prenom', 50)->nullable();
            $table->string('sexe')->nullable();
            $table->string('nationalite')->nullable();
            $table->string('date_naissance')->nullable();
            $table->string('lieu_naissance')->nullable();
            $table->string('numero_permis')->nullable(); // Unique
            $table->string('type_permis')->nullable();
            $table->string('categorie')->nullable();
            $table->string('date_obtention')->nullable();
            $table->string('lieu_obtention')->nullable();
            $table->string('date_validite')->nullable();
            $table->string('numero_origine_permis')->nullable();
            $table->string('lieu_origine')->nullable();
            $table->string('date_renou1')->nullable(); // Optionnel
            $table->string('date_renou2')->nullable(); // Optionnel
            $table->string('date_renou3')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('h_e_permis');
    }
};
