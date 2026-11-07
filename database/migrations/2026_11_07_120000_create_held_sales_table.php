<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Poner en espera" en caja (como en SICAR): aparcar una venta a medio armar sin cobrarla
 * ni mover inventario, para atender a otro cliente mientras tanto. Vive en el servidor (no
 * en el navegador) y por sucursal, no por cajero, para que cualquiera en ese mostrador la
 * pueda recuperar. `payload` es exactamente lo mismo que guarda el borrador automático de
 * caja (carrito, cliente, pago…), tal cual, para poder recargarlo en la pantalla.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('held_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->json('payload');
            $table->timestamps();
            $table->index(['branch_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('held_sales');
    }
};
