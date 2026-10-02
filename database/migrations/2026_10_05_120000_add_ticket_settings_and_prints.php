<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ticket de caja:
 *  - branches.ticket (JSON): datos que imprime cada sucursal (razón social, dirección,
 *    teléfono, RFC, leyendas). Vacío = valores por omisión (ver Branch::ticketSettings()).
 *  - ticket_prints: bitácora de impresiones; la segunda en adelante sale como REIMPRESIÓN.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->json('ticket')->nullable();
        });

        Schema::create('ticket_prints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('reprint')->default(false);
            $table->timestamps();
            $table->index(['note_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_prints');
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('ticket');
        });
    }
};
