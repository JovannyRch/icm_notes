<?php

namespace Database\Seeders;

use App\Models\Note;
use App\Models\NoteProduct;
use App\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Datos de ejemplo para probar N pagos a mano (solo local, no producción).
 *
 *   APP_ENV=e2e php artisan db:seed --class=Database\\Seeders\\DemoPagosSeeder
 *
 * Deja tres notas que cubren los casos interesantes del corte de hoy:
 *  - DEMO-1: nota de hace 6 días con un abono HOY  -> "entradas anteriores"
 *  - DEMO-2: nota de hoy liquidada en un solo pago
 *  - DEMO-3: nota de hoy con abono parcial
 */
class DemoPagosSeeder extends Seeder
{
    public function run(): void
    {
        $branchId = 1;
        $today = now()->format('Y-m-d');
        $sixDaysAgo = now()->subDays(6)->format('Y-m-d');
        $twoDaysAgo = now()->subDays(2)->format('Y-m-d');

        $notes = [
            [
                'folio' => 'DEMO-1',
                'customer' => 'Abono en tres fechas',
                'date' => $sixDaysAgo,
                'product' => 'MICHELIN',
                'payments' => [
                    ['date' => $sixDaysAgo, 'cash' => 1000],
                    ['date' => $twoDaysAgo, 'transfer' => 700],
                    ['date' => $today, 'card' => 300],
                ],
            ],
            [
                'folio' => 'DEMO-2',
                'customer' => 'Liquidada hoy',
                'date' => $today,
                'product' => 'PIRELLI',
                'payments' => [
                    ['date' => $today, 'cash' => 1800],
                ],
            ],
            [
                'folio' => 'DEMO-3',
                'customer' => 'Abono parcial',
                'date' => $today,
                'product' => 'GOODYEAR',
                'payments' => [
                    ['date' => $today, 'cash' => 500],
                ],
            ],
        ];

        foreach ($notes as $data) {
            if (Note::where('folio', $data['folio'])->exists()) {
                continue;
            }

            $product = Product::where('brand', $data['product'])->firstOrFail();

            $note = Note::create([
                'folio' => $data['folio'],
                'customer' => $data['customer'],
                'date' => $data['date'],
                'purchase_total' => $product->cost,
                'sale_total' => $product->price,
                'flete' => 0,
                'branch_id' => $branchId,
                'delivery_status' => 'pendiente',
                'status' => 'pending',
                'purchase_status' => 'pending',
            ]);

            NoteProduct::create([
                'note_id' => $note->id,
                'product_id' => $product->id,
                'brand' => $product->brand,
                'model' => $product->model,
                'measure' => $product->measure,
                'mc' => $product->mc,
                'unit' => $product->unit,
                'quantity' => 1,
                'cost' => $product->cost,
                'price' => $product->price,
                'iva' => $product->iva,
                'extra' => $product->extra,
                'purchase_subtotal' => $product->cost,
                'sale_subtotal' => $product->price,
                'supplied_status' => 'no_enviado',
                'delivery_status' => 'pendiente',
            ]);

            foreach (array_values($data['payments']) as $position => $payment) {
                $note->payments()->create([
                    'branch_id' => $branchId,
                    'date' => $payment['date'],
                    'cash' => $payment['cash'] ?? 0,
                    'card' => $payment['card'] ?? 0,
                    'transfer' => $payment['transfer'] ?? 0,
                    'position' => $position,
                ]);
            }

            $note->recalculateTotalsFromPayments();

            if ((float) $note->balance === 0.0) {
                $note->update(['status' => 'paid']);
            }
        }
    }
}
