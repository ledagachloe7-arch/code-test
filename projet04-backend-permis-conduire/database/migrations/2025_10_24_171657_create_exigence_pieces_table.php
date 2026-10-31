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
        Schema::create('exigence_pieces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('description');
            $table->integer('number_pieces_required');
            $table->integer('number_pieces_given');
            $table->boolean('exigenceSatisfaite');
            $table->timestamps();
            // FK vers la table etapes
            $table->foreignUuid('etape_id')->constrained('etapes')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exigence_pieces');
    }
};
