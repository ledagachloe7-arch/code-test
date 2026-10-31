<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('transitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();        // ex: T_VERIF_OK
            $table->string('libelle');
            $table->string('type');                  // MANUELLE | AUTOMATIQUE | TEMPORISEE
            $table->text('condition')->nullable();   // expression/guard
            $table->json('actions')->nullable();     // JSON d'actions post-transition
            $table->timestamps();

            $table->foreignUuid('source_etape_id')->references('id')->on('etapes')->cascadeOnDelete();
            $table->foreignUuid('cible_etape_id')->references('id')->on('etapes')->cascadeOnDelete();

            $table->index(['source_etape_id', 'cible_etape_id']);
            $table->index('type');
        });
    }
    public function down(): void {
        Schema::dropIfExists('transitions');
    }
};
