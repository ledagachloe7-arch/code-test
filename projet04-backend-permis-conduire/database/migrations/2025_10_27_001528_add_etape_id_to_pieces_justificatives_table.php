<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pieces_justificatives', function (Blueprint $table) {
            $table->uuid('etape_id')->after('id'); // ajoute la colonne
            $table->foreign('etape_id')->references('id')->on('etapes')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pieces_justificatives', function (Blueprint $table) {
            $table->dropForeign(['etape_id']);
            $table->dropColumn('etape_id');
        });
    }
};
