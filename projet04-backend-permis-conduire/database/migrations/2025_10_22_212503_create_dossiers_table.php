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
        Schema::create('dossiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('candidat_id')->nullable()->constrained('candidats')->onDelete('cascade');
            $table->foreignUuid('auto_ecole_id')->nullable()->constrained('auto_ecoles')->onDelete('cascade');
            $table->foreignUuid('formation_id')->nullable()->constrained('formation_auto_ecoles')->onDelete('cascade');
            $table->string('statut');
            $table->json('commentaires')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossiers');
    }
};
