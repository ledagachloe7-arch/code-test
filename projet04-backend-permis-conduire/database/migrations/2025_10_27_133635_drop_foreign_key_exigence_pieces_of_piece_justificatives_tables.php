<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Supprime la colonne exigence_piece_id de pieces_justificatives.
     */
    public function up(): void
    {
        Schema::table('pieces_justificatives', function (Blueprint $table) {
            // Supprime la clé étrangère si elle existe
            if (Schema::hasColumn('pieces_justificatives', 'exigence_piece_id')) {
                $table->dropForeign(['exigence_piece_id']);
                $table->dropColumn('exigence_piece_id');
            }
        });
    }

    /**
     * Ajoute à nouveau la colonne exigence_piece_id en cas de rollback.
     */
    public function down(): void
    {
        Schema::table('pieces_justificatives', function (Blueprint $table) {
            $table->foreignUuid('exigence_piece_id')
                ->nullable()
                ->constrained('exigence_pieces')
                ->nullOnDelete();
        });
    }
};
