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
        Schema::create('pieces_justificatives', function (Blueprint $table) {
            // UUID primaire
            $table->uuid('id')->primary();

            // Références vers d'autres tables
            $table->foreignUuid('type_document_id')
                ->nullable()
                ->constrained('referentiels')
                ->nullOnDelete();

            $table->foreignUuid('type_permis_id')
                ->nullable()
                ->constrained('referentiels')
                ->nullOnDelete();

            $table->foreignUuid('inscription_id')
                ->nullable()
                ->constrained('referentiels')
                ->nullOnDelete();

            // Champs métiers
            $table->string('code')->nullable()->unique();
            $table->string('libelle')->nullable();
            $table->string('format_attendu')->nullable();

            $table->boolean('obligatoire')->default(false);

            $table->date('delivery_date')->nullable();
            $table->date('expiration_date')->nullable();

            $table->foreignUuid('exigence_piece_id')
          ->nullable()
          ->constrained('exigence_pieces')
          ->nullOnDelete();

            // Timestamps Laravel
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pieces_justificatives');
    }
};
