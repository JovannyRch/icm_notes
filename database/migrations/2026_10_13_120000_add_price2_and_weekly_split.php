<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - products.price2: segundo precio del producto (p. ej. mayoreo); null = no tiene.
 * - note_product.price_level: con qué precio del catálogo se vendió la partida (1 o 2).
 * - branches.weekly_split: si el corte semanal reparte la utilidad al 50% (sí, por omisión).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price2', 12, 2)->nullable();
        });
        Schema::table('note_product', function (Blueprint $table) {
            $table->unsignedTinyInteger('price_level')->default(1);
        });
        Schema::table('branches', function (Blueprint $table) {
            $table->boolean('weekly_split')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('price2'));
        Schema::table('note_product', fn (Blueprint $table) => $table->dropColumn('price_level'));
        Schema::table('branches', fn (Blueprint $table) => $table->dropColumn('weekly_split'));
    }
};
