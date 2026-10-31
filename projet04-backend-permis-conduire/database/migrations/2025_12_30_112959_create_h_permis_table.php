<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('h_permis', function (Blueprint $table) {
            $table->uuid('id')->primary(); // Identifiant unique technique
            $table->string('numero_identite', 20)->nullable();
            $table->string('nom', 50); // Obligatoire
            $table->string('prenom', 50)->nullable();
            $table->char('sexe', 1)->nullable();
            $table->string('nationalite', 30)->nullable();
            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance', 100)->nullable();
            $table->string('numero_permis', 200)->nullable();
            $table->string('type_permis', 20)->nullable();
            $table->string('categorie', 10)->nullable();
            $table->date('date_obtention')->nullable();
            $table->string('lieu_obtention', 100)->nullable();
            $table->date('date_validite')->nullable();
            $table->string('numero_origine_permis', 200)->nullable();
            $table->string('lieu_origine', 100)->nullable();
            $table->date('date_renou1')->nullable(); // Optionnel
            $table->date('date_renou2')->nullable(); // Optionnel
            $table->date('date_renou3')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('h_permis');
    }
};
