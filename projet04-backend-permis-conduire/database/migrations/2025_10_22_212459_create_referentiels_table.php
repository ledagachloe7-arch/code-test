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
        Schema::create('referentiels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('libelle');
            $table->string('code')->unique();
            $table->string('type_ref');
            $table->text('description')->nullable();
            $table->boolean('statut')->default(true);
            $table->timestamps();
            
            // Index pour optimiser les recherches
            $table->index(['type_ref', 'statut']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referentiels');
    }
};
