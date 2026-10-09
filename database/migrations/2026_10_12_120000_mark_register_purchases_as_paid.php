<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Las ventas de caja guardan la compra al proveedor como liquidada (SaleService). Las que se
 * hicieron mientras se guardaba "pending" se quedaron "Por pagar": se corrigen aquí. Sólo
 * toca notas de caja (notes.source), nunca las capturadas a mano en el formulario.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('notes')
            ->where('source', 'caja')
            ->where('purchase_status', 'pending')
            ->update(['purchase_status' => 'paid']);
    }

    public function down(): void
    {
        // Sin vuelta atrás: no se sabe cuáles estaban pendientes antes.
    }
};
