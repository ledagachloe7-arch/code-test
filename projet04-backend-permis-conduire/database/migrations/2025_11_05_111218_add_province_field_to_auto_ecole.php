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
        Schema::table('auto_ecoles', function (Blueprint $table) {
            if (!Schema::hasColumn('auto_ecoles', 'province_id')) {
                $table->foreignUuid('province_id')
                ->nullable()
                ->references('id')
                ->on('referentiels')
                ->onDelete('restrict');
            }
        });
    }

    /**
     * Annuler la migration.
     */
    public function down(): void
    {
        Schema::table('auto_ecoles', function (Blueprint $table) {
            if (Schema::hasColumn('auto_ecoles', 'province_id')) {
                $table->dropForeign(['province_id']);
                $table->dropColumn('province_id');
            }
        });
    }
};
