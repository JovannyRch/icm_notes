<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tipo de tarjeta del pago: 'credito' o 'debito' (para cuadrar con la terminal). El importe
 * sigue en `card`; null = pago anterior a este campo o no especificado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('note_payments', function (Blueprint $table) {
            $table->string('card_type', 10)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('note_payments', function (Blueprint $table) {
            $table->dropColumn('card_type');
        });
    }
};
