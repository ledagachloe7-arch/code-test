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
        Schema::table('dossiers', function (Blueprint $table) {
            //
            $table->uuid('referenciel_id')->nullable();
            $table->foreign('referenciel_id')
                ->references('id')
                ->on('referentiels')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            //
            $table->dropForeign(['referenciel_id']);
            $table->dropColumn('referenciel_id');
        });
    }
};
