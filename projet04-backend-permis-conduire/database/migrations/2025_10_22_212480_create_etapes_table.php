<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void {
        Schema::create('etapes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();          // code interne de l'étape
            $table->string('libelle');
            $table->json('roles');
            $table->string('statut_libelle');
            $table->foreignUuid('circuit_id')->constrained('circuit')->on('circuits')->cascadeOnDelete();
            $table->foreignUuid('statut_id')->constrained('statuts')->restrictOnDelete();
            $table->timestamps();

            $table->index(['circuit_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('etapes');
    }
};
