<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Datos de contacto del cliente en la nota (para ventas a crédito y cobranza). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('customer_phone', 30)->nullable();
            $table->string('customer_address', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn(['customer_phone', 'customer_address']);
        });
    }
};
