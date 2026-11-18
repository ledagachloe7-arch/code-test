<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Un duplicata du permis rose peut couvrir plusieurs catégories (lignes h_permis) d'un même titulaire.
 * duplicata_demandes.permis_source_id reste le permis « principal » (celui recherché).
 * Les demandes existantes sont reprises avec leur permis source unique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('duplicata_demande_permis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('duplicata_demande_id');
            $table->foreign('duplicata_demande_id')->references('id')->on('duplicata_demandes')->cascadeOnDelete();
            $table->uuid('h_permis_id')->index();
            $table->foreign('h_permis_id')->references('id')->on('h_permis')->restrictOnDelete();
            $table->string('numero_permis', 200)->nullable();
            $table->string('categorie', 10)->nullable();
            $table->timestamps();

            $table->unique(['duplicata_demande_id', 'h_permis_id']);
        });

        // Reprise des demandes existantes (une catégorie chacune).
        foreach (DB::table('duplicata_demandes as d')
            ->join('h_permis as h', 'h.id', '=', 'd.permis_source_id')
            ->get(['d.id', 'd.permis_source_id', 'h.numero_permis', 'h.categorie']) as $d) {
            DB::table('duplicata_demande_permis')->insert([
                'id' => (string) Str::uuid(),
                'duplicata_demande_id' => $d->id,
                'h_permis_id' => $d->permis_source_id,
                'numero_permis' => $d->numero_permis,
                'categorie' => $d->categorie,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('duplicata_demande_permis');
    }
};
