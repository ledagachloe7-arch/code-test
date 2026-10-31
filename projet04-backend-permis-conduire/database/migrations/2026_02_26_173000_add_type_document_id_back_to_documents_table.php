<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Réajoute type_document_id (supprimé par remove_type_document_id) pour l'upload document dossier.
     */
    public function up(): void
    {
        if (Schema::hasColumn('documents', 'type_document_id')) {
            return;
        }

        Schema::table('documents', function (Blueprint $table) {
            $table->foreignUuid('type_document_id')
                ->nullable()
                ->after('documentable_type')
                ->constrained('referentiels')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['type_document_id']);
        });
    }
};
