<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Circuits Renouvellement, Mise à jour et Duplicata communs au permis rose et à la fiche d'enregistrement (permis vert).
 *
 * Ajoute la colonne `support` (ROSE | VERT) ; les lignes existantes sont toutes du permis rose.
 * L'unicité « une demande de renouvellement en attente par titulaire » devient « par titulaire et par support » :
 * un titulaire peut renouveler son permis rose et sa fiche indépendamment.
 */
return new class extends Migration
{
    private const TABLES = ['renouvellements', 'modification_demandes', 'duplicata_demandes'];

    public function up(): void
    {
        foreach (self::TABLES as $t) {
            Schema::table($t, function (Blueprint $table) {
                $table->string('support', 10)->default('ROSE')->index();
            });
        }

        DB::statement('DROP INDEX IF EXISTS renouvellements_un_en_attente_par_titulaire');
        DB::statement(
            "CREATE UNIQUE INDEX renouvellements_un_en_attente_par_titulaire_support
             ON renouvellements (numero_identite, support)
             WHERE statut = 'EN_ATTENTE_PAIEMENT'"
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS renouvellements_un_en_attente_par_titulaire_support');
        DB::statement(
            "CREATE UNIQUE INDEX renouvellements_un_en_attente_par_titulaire
             ON renouvellements (numero_identite)
             WHERE statut = 'EN_ATTENTE_PAIEMENT'"
        );

        foreach (self::TABLES as $t) {
            Schema::table($t, function (Blueprint $table) {
                $table->dropIndex([ 'support' ]);
                $table->dropColumn('support');
            });
        }
    }
};
