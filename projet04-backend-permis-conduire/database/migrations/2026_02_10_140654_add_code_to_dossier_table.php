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
        Schema::table('dossiers', function (Blueprint $table) {
            //
            if (!Schema::hasColumn('numero', 'dossiers')) {
                $table->string('numero')->nullable()->unique();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            //
            if (Schema::hasColumn('numero', 'dossiers')) {
                $table->dropColumn('numero');
            }
        });
    }
};
