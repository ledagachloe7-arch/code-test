<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Verrouillage de dossier : un agent ouvre le dossier (is_locked, opened_by, opened_at),
     * un autre ne peut pas l'ouvrir tant qu'il n'est pas fermé ou après timeout (ex. 30 min).
     */
    public function up(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('centre_id');
            $table->foreignUuid('opened_by')->nullable()->after('is_locked')->constrained('utilisateurs')->nullOnDelete();
            $table->timestamp('opened_at')->nullable()->after('opened_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->dropForeign(['opened_by']);
            $table->dropColumn(['is_locked', 'opened_by', 'opened_at']);
        });
    }
};
