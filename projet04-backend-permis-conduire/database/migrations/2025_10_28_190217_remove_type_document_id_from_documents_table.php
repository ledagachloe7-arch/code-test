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
        Schema::table('documents', function (Blueprint $table) {
            // Supprimer la contrainte de clé étrangère
            $table->dropForeign(['type_document_id']);
            // Supprimer la colonne type_document_id
            $table->dropColumn('type_document_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Réajouter la colonne type_document_id
            $table->foreignUuid('type_document_id')->constrained('referentiels')->onDelete('cascade');
        });
    }
};
