<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void {
        Schema::create('circuits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('libelle');
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->index(['libelle']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('circuits');
    }
};
