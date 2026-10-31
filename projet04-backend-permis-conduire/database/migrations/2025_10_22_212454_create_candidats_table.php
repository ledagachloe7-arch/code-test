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
        Schema::create('candidats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('personne_id')->constrained('personnes')->onDelete('cascade');
            $table->string('numero_candidat')->unique();
            $table->date('date_naissance');
            $table->string('lieu_naissance');
            $table->string('nip')->unique();
            $table->string('type_piece');
            $table->string('numero_piece')->unique();
            $table->string('nationalite');
            $table->string('genre');
            $table->timestamps();
        });

        // Ajouter la contrainte CHECK pour PostgreSQL
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE candidats ADD CONSTRAINT candidats_genre_check CHECK (genre IN ('M', 'F'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidats');
    }
};
