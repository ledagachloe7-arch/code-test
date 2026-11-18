<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1. cneddt_shortcodes : shortcodes (cashier_short_code) renvoyés par la CNEDDT lors des transferts de dossiers,
 *    rattachés au candidat / titulaire (source du contrôle shortcode du duplicata rose).
 * 2. duplicata_demandes : demandes de duplicata du permis rose, liées au nouveau dossier et au permis source.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cneddt_shortcodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('shortcode', 50)->index();
            // ACTIF | SUSPENDU | ANNULE (statuts non actifs = à régulariser)
            $table->string('statut', 20)->default('ACTIF');
            $table->string('source', 30)->default('TRANSFERT_CNEDDT');

            // Rattachement
            $table->uuid('dossier_id')->nullable()->unique();
            $table->uuid('candidat_id')->nullable()->index();
            $table->string('numero_piece', 50)->nullable()->index();
            $table->string('numero_permis', 200)->nullable()->index();
            $table->string('nom', 100)->nullable();
            $table->string('prenom', 100)->nullable();
            $table->date('date_naissance')->nullable();

            $table->json('donnees_cneddt')->nullable();
            $table->timestamps();
        });

        Schema::create('duplicata_demandes', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Nouveau dossier créé (type DUPLICATA)
            $table->uuid('dossier_id')->unique();
            $table->foreign('dossier_id')->references('id')->on('dossiers')->restrictOnDelete();

            // Permis source (jamais modifié)
            $table->uuid('permis_source_id')->index();
            $table->foreign('permis_source_id')->references('id')->on('h_permis')->restrictOnDelete();
            $table->string('numero_permis_source', 200);
            $table->string('numero_identite', 50)->nullable()->index();
            $table->uuid('candidat_id')->nullable();

            // Contrôle shortcode (résultat serveur au moment de la création)
            $table->string('resultat_controle_shortcode', 20);
            $table->uuid('shortcode_id')->nullable();
            $table->string('shortcode', 50)->nullable();

            // Saisie
            $table->string('motif_duplicata', 30);
            $table->string('motif_precision')->nullable();
            $table->text('observations')->nullable();
            $table->string('justificatif_path')->nullable();
            $table->string('justificatif_nom')->nullable();
            $table->string('justificatif_mime', 100)->nullable();

            // Traçabilité
            $table->uuid('created_by')->nullable();
            $table->string('created_by_email')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('duplicata_demandes');
        Schema::dropIfExists('cneddt_shortcodes');
    }
};
