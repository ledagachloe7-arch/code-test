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
        Schema::table('dossiers', function (Blueprint $table) {
            $table->boolean('expired')->default(false);
            $table->date('expiration_date')->nullable();
            $table->boolean('suspended')->default(false);
            $table->date('suspended_date')->nullable();
            $table->foreignUuid('province_id')->nullable()->constrained('referentiels')->nullOnDelete();
            $table->foreignUuid('centre_id')->nullable()->constrained('referentiels')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->dropForeign(['province_id']);
            $table->dropForeign(['centre_id']);
            $table->dropColumn([
                'expired',
                'expiration_date',
                'suspended',
                'suspended_date',
                'province_id',
                'centre_id',
            ]);
        });
    }
};
