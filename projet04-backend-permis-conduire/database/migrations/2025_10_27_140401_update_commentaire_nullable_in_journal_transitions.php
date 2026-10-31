<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE journal_transitions ALTER COLUMN commentaire DROP NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('journal_transitions', function (Blueprint $table) {
                $table->text('commentaire')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE journal_transitions ALTER COLUMN commentaire SET NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('journal_transitions', function (Blueprint $table) {
                $table->text('commentaire')->nullable(false)->change();
            });
        }
    }
};
