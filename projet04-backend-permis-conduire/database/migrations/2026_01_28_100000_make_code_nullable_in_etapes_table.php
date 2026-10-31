<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
<<<<<<< HEAD
=======
     * Rendre le champ code facultatif (nullable) dans la table etapes.
>>>>>>> 581f0d9102b1569250fa899664334308d6244eef
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE etapes ALTER COLUMN code DROP NOT NULL');
        } else {
            DB::statement('ALTER TABLE etapes MODIFY code VARCHAR(255) NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE etapes ALTER COLUMN code SET NOT NULL');
        } else {
            DB::statement('ALTER TABLE etapes MODIFY code VARCHAR(255) NOT NULL');
        }
    }
};
