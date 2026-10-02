<?php


namespace App\Services;

use App\Models\Stock;
use App\Models\StockMovement;

class StockService
{
    public function adjustStock(
        int $branchId,
        int $productId,
        float $quantity,
        string $type,
        ?int $noteId = null,
        ?string $description = null,
        ?bool $isCount = null
    ) {

        $stock = Stock::firstOrCreate(
            ['branch_id' => $branchId, 'product_id' => $productId],
            ['quantity' => 0]
        );



        if ($type === 'IN') {
            $stock->quantity += $quantity;
        } elseif ($type === 'OUT') {
            $stock->quantity -= $quantity;
        } else if ($type === 'ADJUSTMENT') {
            $stock->quantity = $quantity;
        }


        // ¿Este movimiento es un conteo de inventario? Por omisión: un ajuste o una
        // entrada que no viene de una nota (Excel, nota de entrada, manual). Las ventas
        // y las devoluciones por editar/cancelar/eliminar notas no cuentan.
        $isCount ??= $type === 'ADJUSTMENT' || ($type === 'IN' && $noteId === null);
        if ($isCount && $stock->counted_at === null) {
            $stock->counted_at = now();
        }

        $stock->save();

        StockMovement::create([
            'branch_id' => $branchId,
            'product_id' => $productId,
            'movement_type' => $type,
            'quantity' => $quantity,
            'note_id' => $noteId,
            'description' => $description,
        ]);
    }
}
