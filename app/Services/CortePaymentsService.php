<?php

namespace App\Services;

use App\Models\Note;
use App\Models\NotePayment;

/**
 * Arma los datos del corte diario a partir de los pagos, no de la fecha de la nota.
 *
 * El dinero de un día son los pagos hechos ese día. Se separan en dos grupos:
 *  - notes: notas emitidas ese día (la tabla "VENTA CON NOTAS DE PEDIDO")
 *  - previous_payments: pagos de ese día sobre notas de días anteriores
 *    (la tabla "ENTRADAS ANTERIORES", que antes se capturaba a mano)
 */
class CortePaymentsService
{
    public function forBranchAndDate(int $branchId, string $date): array
    {
        // Comparación directa y no whereDate(): las dos columnas son DATE, y
        // whereDate genera `"date"::date = ?` en PostgreSQL, lo que anula el
        // índice (branch_id, date).
        $notes = Note::with('payments')
            ->where('branch_id', $branchId)
            ->where('date', $date)
            ->orderBy('folio', 'asc')
            ->get();

        $noteIdsOfTheDay = $notes->pluck('id');

        $previousPayments = NotePayment::with('note:id,folio,date')
            ->where('branch_id', $branchId)
            ->where('date', $date)
            ->whereNotIn('note_id', $noteIdsOfTheDay)
            ->orderBy('note_id')
            ->orderBy('position')
            ->get()
            ->map(fn (NotePayment $payment) => [
                'folio' => $payment->note?->folio ?? '',
                // La fecha que interesa aquí es la de la nota original, no la del pago.
                'date' => $payment->note?->date,
                'cash' => (string) $payment->cash,
                'card' => (string) $payment->card,
                'transfer' => (string) $payment->transfer,
            ])
            ->values()
            ->all();

        return [
            'notes' => $notes,
            'previous_payments' => $previousPayments,
        ];
    }
}
