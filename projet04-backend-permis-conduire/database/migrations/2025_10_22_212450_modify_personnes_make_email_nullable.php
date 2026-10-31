<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE personnes ALTER COLUMN email DROP NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('personnes', function (Blueprint $table) {
                // Rendre email nullable et supprimer la contrainte unique si elle existe
                $table->string('email')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE personnes ALTER COLUMN email SET NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('personnes', function (Blueprint $table) {
                // Remettre email obligatoire
                $table->string('email')->nullable(false)->change();
            });
        }
    }
};

