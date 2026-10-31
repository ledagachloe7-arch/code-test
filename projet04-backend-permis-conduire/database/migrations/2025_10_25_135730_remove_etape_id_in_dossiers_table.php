<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            if (Schema::hasColumn('dossiers', 'etape_id')) {

                // 🔍 Vérifie si une contrainte étrangère existe sur cette colonne
                $constraint = DB::selectOne("
                    SELECT constraint_name
                    FROM information_schema.key_column_usage
                    WHERE table_name = 'dossiers'
                      AND column_name = 'etape_id'
                ");

                if ($constraint) {
                    // 💣 Supprime la contrainte uniquement si elle existe
                    DB::statement("ALTER TABLE dossiers DROP CONSTRAINT {$constraint->constraint_name}");
                }

                // 🗑️ Supprimer la colonne
                $table->dropColumn('etape_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->uuid('etape_id')->nullable()->after('id');
            // Si tu veux remettre la contrainte :
            // $table->foreign('etape_id')->references('id')->on('etapes')->nullOnDelete();
        });
    }
};
