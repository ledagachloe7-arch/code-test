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
        Schema::table('referentiels', function (Blueprint $table) {
            //
            $table->decimal('montant', 15, 2)->nullable();

            $table->uuid('type_demande')->nullable();
            $table->uuid('type_permis')->nullable();

            $table->foreign('type_demande')
                ->references('id')
                ->on('referentiels')
                ->nullOnDelete();

            $table->foreign('type_permis')
                ->references('id')
                ->on('referentiels')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('referentiels', function (Blueprint $table) {
            //
            $table->dropForeign(['type_demande']);
            $table->dropForeign(['type_permis']);

            $table->dropColumn([
                'montant',
                'type_demande',
                'type_permis',
            ]);
        });
    }
};
