<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * stocks.counted_at: primera vez que se contaron las existencias de ese producto
     * en esa sucursal (carga por Excel, ajuste, nota de entrada o movimiento manual).
     * Mientras sea null el producto "no tiene inventario cargado": la nota no avisa
     * de existencias aunque las ventas lo dejen en negativo.
     */
    public function up(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->timestamp('counted_at')->nullable()->after('quantity');
        });

        // Respaldo: primera entrada/ajuste que no venga de una nota. Query builder +
        // updates por fila (sin UPDATE correlacionado) para correr igual en los 3 motores.
        $firstCounts = DB::table('stock_movements')
            ->select('branch_id', 'product_id')
            ->selectRaw('MIN(created_at) as first_count')
            ->where(function ($q) {
                $q->where('movement_type', 'ADJUSTMENT')
                    ->orWhere(fn ($q) => $q->where('movement_type', 'IN')
                        ->whereNull('note_id')
                        ->where(fn ($q) => $q->whereNull('description')->orWhere('description', 'not like', 'Devolución por%')));
            })
            ->groupBy('branch_id', 'product_id')
            ->get();

        foreach ($firstCounts as $row) {
            DB::table('stocks')
                ->where('branch_id', $row->branch_id)
                ->where('product_id', $row->product_id)
                ->update(['counted_at' => $row->first_count]);
        }
    }

    public function down(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->dropColumn('counted_at');
        });
    }
};
