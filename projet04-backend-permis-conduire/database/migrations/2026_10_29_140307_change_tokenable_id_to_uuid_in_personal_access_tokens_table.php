<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // La table est actuellement vide : aucune association à perdre.
        if (DB::table('personal_access_tokens')->exists()) {
            throw new RuntimeException(
                'La table contient des jetons. Migration interrompue par sécurité.'
            );
        }

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex(
                'personal_access_tokens_tokenable_type_tokenable_id_index'
            );
        });

        DB::statement(
            'ALTER TABLE personal_access_tokens
             ALTER COLUMN tokenable_id TYPE uuid
             USING tokenable_id::text::uuid'
        );

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->index(['tokenable_type', 'tokenable_id']);
        });
    }

    public function down(): void
    {
        if (DB::table('personal_access_tokens')->exists()) {
            throw new RuntimeException(
                'Impossible de revenir au BIGINT sans risquer de perdre les associations UUID.'
            );
        }

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex(
                'personal_access_tokens_tokenable_type_tokenable_id_index'
            );
        });

        DB::statement(
            'ALTER TABLE personal_access_tokens
             ALTER COLUMN tokenable_id TYPE bigint
             USING NULL::bigint'
        );

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->index(['tokenable_type', 'tokenable_id']);
        });
    }
};