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
        Schema::create('auto_ecoles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nom_auto_ecole');
            $table->text('adresse')->nullable();
            $table->string('email')->unique();
            $table->foreignUuid('responsable_id')->constrained('personnes')->onDelete('cascade');
            $table->string('contact');
            $table->boolean('statut')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auto_ecoles');
    }
};
