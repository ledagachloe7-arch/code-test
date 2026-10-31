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
        if (!Schema::hasColumn('dossiers', 'date_de_dobtention_du_permis')) {
            Schema::table('dossiers', function (Blueprint $table) {
                $table->date('date_de_dobtention_du_permis')->nullable();
              
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            if (Schema::hasColumn('dossiers', 'date_de_dobtention_du_permis')) {
                $table->dropColumn('date_de_dobtention_du_permis');
              
            }
        });
    }
};
