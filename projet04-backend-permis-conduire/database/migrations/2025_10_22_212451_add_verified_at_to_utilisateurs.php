<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('utilisateurs', 'verified_at')) {
            $afterColumn = Schema::hasColumn('utilisateurs', 'email_verified_at')
                ? 'email_verified_at'
                : (Schema::hasColumn('utilisateurs', 'email') ? 'email' : null);

            Schema::table('utilisateurs', function (Blueprint $table) use ($afterColumn) {
                $column = $table->timestamp('verified_at')->nullable();

                if ($afterColumn) {
                    $column->after($afterColumn);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('utilisateurs', 'verified_at')) {
            Schema::table('utilisateurs', function (Blueprint $table) {
                $table->dropColumn('verified_at');
            });
        }
    }
};

