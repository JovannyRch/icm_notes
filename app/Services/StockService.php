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
        ?string $description = null
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
