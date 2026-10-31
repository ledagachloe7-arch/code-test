<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('statuts', function (Blueprint $table) {
            if (!Schema::hasColumn('statuts', 'code')) {
                $table->string('code')->unique()->after('id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('statuts', function (Blueprint $table) {
            if (Schema::hasColumn('statuts', 'code')) {
                $table->dropColumn('code');
            }
        });
    }
};
