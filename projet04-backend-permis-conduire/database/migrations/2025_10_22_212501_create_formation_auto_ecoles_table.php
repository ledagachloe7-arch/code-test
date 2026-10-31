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
        Schema::create('formation_auto_ecoles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('auto_ecole_id')->constrained('auto_ecoles')->onDelete('cascade');
            $table->foreignUuid('type_permis_id')->constrained('referentiels')->onDelete('cascade');
            $table->decimal('montant', 10, 2);
            $table->text('description')->nullable();
            $table->foreignUuid('session_id')->constrained('referentiels')->onDelete('cascade');
            $table->boolean('statut')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formation_auto_ecoles');
    }
};
