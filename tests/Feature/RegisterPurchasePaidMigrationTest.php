<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** La migración que liquida la compra de las ventas de caja guardadas como "Por pagar". */
class RegisterPurchasePaidMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_register_sales_are_marked_paid(): void
    {
        $branch = Branch::create(['name' => 'A']);
        $make = function (string $source, string $purchase) use ($branch) {
            $note = new Note(['folio' => $source.$purchase, 'customer' => 'X', 'date' => '2026-10-09', 'branch_id' => $branch->id, 'sale_total' => 100,
                'purchase_total' => 50, 'status' => 'pending', 'purchase_status' => $purchase, 'delivery_status' => 'entregado_a_cliente', 'flete' => 0]);
            $note->forceFill(['source' => $source])->save();

            return $note;
        };
        $caja = $make('caja', 'pending');
        $manual = $make('nota', 'pending');

        (require database_path('migrations/2026_10_12_120000_mark_register_purchases_as_paid.php'))->up();

        $this->assertSame('paid', $caja->fresh()->purchase_status);
        $this->assertSame('pending', $manual->fresh()->purchase_status, 'las notas a mano no se tocan');
        $this->assertSame('pending', $caja->fresh()->status, 'el cobro al cliente no cambia');
    }
}
