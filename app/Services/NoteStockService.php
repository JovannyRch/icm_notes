<?php

namespace App\Services;

use App\Models\Note;
use App\Models\NoteProduct;

/**
 * Inventario que corresponde a cada nota de venta.
 *
 * Regla: una nota activa tiene descontadas sus piezas en SU sucursal; una nota
 * cancelada (entrega "cancelado" o estatus "canceled", igual que cleanNotes() del
 * corte) no tiene nada descontado; una nota eliminada devuelve lo que tenía.
 * Al editar sólo se mueve la diferencia, para no volver a descontar lo ya descontado.
 */
class NoteStockService
{
    public function __construct(private StockService $stock = new StockService) {}

    public static function isCancelled(Note $note): bool
    {
        return $note->delivery_status === 'cancelado' || $note->status === 'canceled';
    }

    /** Piezas que la nota DEBE tener descontadas, por "sucursal:producto". */
    public function expectedQuantities(Note $note): array
    {
        if (self::isCancelled($note)) {
            return [];
        }

        $quantities = [];
        foreach (NoteProduct::where('note_id', $note->id)->whereNotNull('product_id')->get(['product_id', 'quantity']) as $item) {
            $key = $note->branch_id.':'.$item->product_id;
            $quantities[$key] = ($quantities[$key] ?? 0) + (float) $item->quantity;
        }

        return $quantities;
    }

    /**
     * Mueve la diferencia entre lo que la nota tenía descontado ($before) y lo que
     * debe tener ahora ($after). Cubre editar partidas, cancelar y reactivar.
     */
    public function sync(Note $note, array $before, array $after, ?string $reason = null): void
    {
        foreach (array_unique(array_merge(array_keys($before), array_keys($after))) as $key) {
            $delta = ($after[$key] ?? 0) - ($before[$key] ?? 0);
            if (abs($delta) < 0.0001) {
                continue;
            }
            [$branchId, $productId] = array_map('intval', explode(':', $key));
            $this->stock->adjustStock(
                $branchId,
                $productId,
                abs($delta),
                $delta > 0 ? 'OUT' : 'IN',
                $note->id,
                $reason ?? ($delta > 0 ? 'Salida por edición de nota #'.$note->folio : 'Devolución por edición de nota #'.$note->folio)
            );
        }
    }

    /** Antes de eliminar una nota: regresa lo que tenía descontado. */
    public function restore(Note $note): void
    {
        foreach ($this->expectedQuantities($note) as $key => $quantity) {
            [$branchId, $productId] = array_map('intval', explode(':', $key));
            // note_id null: la nota se borra y el movimiento queda como historial.
            $this->stock->adjustStock($branchId, $productId, $quantity, 'IN', null, 'Devolución por eliminación de nota #'.$note->folio);
        }
    }
}
