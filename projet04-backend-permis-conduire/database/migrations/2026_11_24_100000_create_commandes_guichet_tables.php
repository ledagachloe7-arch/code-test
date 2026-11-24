<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Guichet usager : paiement groupé.
 * Une commande regroupe les actions demandées par un usager au guichet (renouvellement, digitalisation, mise à jour),
 * avec un montant total et un code de paiement unique. À la confirmation du paiement, chaque action est validée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commandes_guichet', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero', 30)->unique();

            // Usager (h_permis.numero_identite) + copie au moment de la commande
            $table->string('numero_identite', 50)->nullable()->index();
            $table->string('support', 10)->default('ROSE');
            $table->string('nom')->nullable();
            $table->string('prenom')->nullable();

            // EN_ATTENTE_PAIEMENT | CONFIRME | ECHOUE | ANNULE
            $table->string('statut', 30)->default('EN_ATTENTE_PAIEMENT')->index();

            // Paiement
            $table->string('operateur', 20); // MOOV | AIRTEL
            $table->string('code_paiement', 50)->unique();
            $table->string('reference_paiement', 100)->nullable()->unique();
            $table->decimal('montant', 12, 2);
            $table->string('telephone', 30)->nullable();
            $table->timestamp('date_confirmation_paiement')->nullable();
            $table->string('motif_echec')->nullable();

            // Traçabilité
            $table->uuid('agent_id')->nullable();
            $table->string('agent_email')->nullable();

            $table->timestamps();
        });

        Schema::create('commande_guichet_lignes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('commande_guichet_id');
            $table->foreign('commande_guichet_id')->references('id')->on('commandes_guichet')->cascadeOnDelete();

            // RENOUVELLEMENT | DIGITALISATION | MISE_A_JOUR
            $table->string('type', 30);
            // Id de l'objet payé : renouvellements.id, dossiers.id ou modification_demandes.id
            $table->uuid('objet_id')->index();
            $table->string('libelle');
            $table->decimal('montant', 12, 2);
            // EN_ATTENTE_PAIEMENT | PAYE | ECHOUE
            $table->string('statut', 30)->default('EN_ATTENTE_PAIEMENT');

            $table->timestamps();
        });

        // Un même objet ne peut être payé que par une seule commande non échouée.
        DB::statement(
            "CREATE UNIQUE INDEX commande_guichet_lignes_objet_actif
             ON commande_guichet_lignes (type, objet_id)
             WHERE statut <> 'ECHOUE'"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('commande_guichet_lignes');
        Schema::dropIfExists('commandes_guichet');
    }
};
