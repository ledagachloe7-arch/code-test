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

        // Table personnes
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE personnes ALTER COLUMN prenom DROP NOT NULL');
        } else {
            Schema::table('personnes', function (Blueprint $table) {
                $table->string('prenom')->nullable()->change();
            });
        }

        // Table paiements
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE paiements ALTER COLUMN prenom DROP NOT NULL');
        } else {
            Schema::table('paiements', function (Blueprint $table) {
                $table->string('prenom')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        // Table personnes
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE personnes ALTER COLUMN prenom SET NOT NULL');
        } else {
            Schema::table('personnes', function (Blueprint $table) {
                $table->string('prenom')->nullable(false)->change();
            });
        }

        // Table paiements
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE paiements ALTER COLUMN prenom SET NOT NULL');
        } else {
            Schema::table('paiements', function (Blueprint $table) {
                $table->string('prenom')->nullable(false)->change();
            });
        }
    }
};

