<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Gestion de la colonne
        if (!Schema::hasColumn('documents', 'node_id_alfresco')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->string('node_id_alfresco')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            if (Schema::hasColumn('documents', 'node_id_alfresco')) {
                $table->dropColumn('node_id_alfresco');
            }
        });
    }
};