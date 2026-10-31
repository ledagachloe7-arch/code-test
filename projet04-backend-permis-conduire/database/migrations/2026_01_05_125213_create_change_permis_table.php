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
        Schema::create('change_permis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero_permis', 20)->nullable();
            $table->string('numero_identite', 20)->nullable();
            $table->string('nom', 20)->nullable();
            $table->string('prenom', 20)->nullable();
            $table->timestamps();
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('change_permis');
    }
};
