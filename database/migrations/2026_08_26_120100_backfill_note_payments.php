<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Convierte los dos pagos fijos (cash/card/transfer + cash2/card2/transfer2)
     * en filas de note_payments.
     *
     * A partir de aquí notes.cash/card/transfer dejan de ser "el primer pago" y
     * pasan a ser el agregado de TODOS los pagos, que es como ya los consumen el
     * corte, el PDF y los reportes.
     */
    public function up(): void
    {
        // En transacción: syncNoteTotals() arranca poniendo los agregados en cero,
        // así que una interrupción a la mitad dejaría importes mal.
        DB::transaction(function () {
            $this->migrateLegacyPayments();
            $this->syncNoteTotals();
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            // Devuelve notes.cash/card/transfer a su significado legacy ("el primer
            // pago") tomándolo de la fila position = 0, y borra los pagos.
            $this->syncNoteTotals(onlyFirstPayment: true);

            DB::table('note_payments')->delete();
        });
    }

    private function migrateLegacyPayments(): void
    {
        DB::table('notes')
            ->select('id', 'branch_id', 'date', 'cash', 'card', 'transfer', 'cash2', 'card2', 'transfer2', 'second_payment_date')
            ->orderBy('id')
            ->chunk(500, function ($notes) {
                $rows = [];
                $now = now();

                foreach ($notes as $note) {
                    // Idempotente: si ya migramos esta nota, no la duplicamos.
                    if (DB::table('note_payments')->where('note_id', $note->id)->exists()) {
                        continue;
                    }

                    $first = [
                        'cash' => (float) ($note->cash ?? 0),
                        'card' => (float) ($note->card ?? 0),
                        'transfer' => (float) ($note->transfer ?? 0),
                    ];

                    $second = [
                        'cash' => (float) ($note->cash2 ?? 0),
                        'card' => (float) ($note->card2 ?? 0),
                        'transfer' => (float) ($note->transfer2 ?? 0),
                    ];

                    if (array_sum($first) > 0) {
                        $rows[] = [
                            'note_id' => $note->id,
                            'branch_id' => $note->branch_id,
                            'date' => $note->date,
                            'cash' => $first['cash'],
                            'card' => $first['card'],
                            'transfer' => $first['transfer'],
                            'position' => 0,
                            'description' => null,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }

                    if (array_sum($second) > 0) {
                        $rows[] = [
                            'note_id' => $note->id,
                            'branch_id' => $note->branch_id,
                            'date' => $note->second_payment_date ?: $note->date,
                            'cash' => $second['cash'],
                            'card' => $second['card'],
                            'transfer' => $second['transfer'],
                            'position' => 1,
                            'description' => null,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                }

                if ($rows) {
                    foreach (array_chunk($rows, 200) as $batch) {
                        DB::table('note_payments')->insert($batch);
                    }
                }
            });
    }

    /**
     * Deriva notes.cash/card/transfer de note_payments.
     *
     * Se calcula desde los pagos (no sumando cash + cash2) para que volver a
     * ejecutar la migración no vuelva a acumular los mismos importes.
     *
     * Se usa el query builder y no SQL crudo a propósito: esta migración corre en
     * MySQL (local) y PostgreSQL (producción), y así cada motor cita sus propios
     * identificadores. `position` además es palabra clave en ambos.
     */
    private function syncNoteTotals(bool $onlyFirstPayment = false): void
    {
        // Las notas sin pagos quedan en cero.
        DB::table('notes')->update(['cash' => 0, 'card' => 0, 'transfer' => 0]);

        DB::table('note_payments')
            ->selectRaw('note_id, SUM(cash) AS sum_cash, SUM(card) AS sum_card, SUM(transfer) AS sum_transfer')
            ->when($onlyFirstPayment, fn ($query) => $query->where('position', 0))
            ->groupBy('note_id')
            ->orderBy('note_id')
            ->chunk(500, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('notes')->where('id', $row->note_id)->update([
                        'cash' => $row->sum_cash,
                        'card' => $row->sum_card,
                        'transfer' => $row->sum_transfer,
                    ]);
                }
            });
    }
};
