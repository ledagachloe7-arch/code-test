<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('registre')->create('registre_permis', function (Blueprint $table) {
            $table->id();

            $table->string('numero_id', 20)->unique();

            $table->string('nom');
            $table->string('prenom');

            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance')->nullable();

            $table->date('date_obtention')->nullable();
            $table->string('lieu_obtention')->nullable();

            $table->string('categorie', 20)->nullable();
            $table->string('numero_permis', 50)->nullable();

            $table->string('numero_origine', 50)->nullable();
            $table->string('lieu_origine')->nullable();

            $table->string('type_permis')->nullable();

            $table->date('date_validite')->nullable();

            $table->date('date_renouvellement_1')->nullable();
            $table->date('date_renouvellement_2')->nullable();
            $table->date('date_renouvellement_3')->nullable();

            $table->string('nationalite')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('registre')->dropIfExists('registre_permis');
    }
};