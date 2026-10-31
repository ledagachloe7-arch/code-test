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
        Schema::table('circuits', function (Blueprint $table) {
            if (!Schema::hasColumn('circuits', 'type_permis')) {
                $table->string('type_permis')->nullable();
            }

            if (!Schema::hasColumn('circuits', 'nationalite')) {
                $table->string('nationalite')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('circuits', function (Blueprint $table) {
            if (Schema::hasColumn('circuits', 'type_permis')) {
                $table->dropColumn('type_permis');
            }

            if (Schema::hasColumn('circuits', 'nationalite')) {
                $table->dropColumn('nationalite');
            }
        });
    }
};
