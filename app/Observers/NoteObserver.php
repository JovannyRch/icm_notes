<?php

namespace App\Observers;

use App\Models\Note;
use App\Services\StockService;

class NoteObserver
{
    public function created(Note $note)
    {
        $stockService = new StockService();

        foreach ($note->items as $item) {
            $stockService->adjustStock(
                $note->branch_id,
                $item->product_id,
                $item->quantity,
                'OUT',
                $note->id,
                'Salida por nota de venta'
            );
        }
    }
}
