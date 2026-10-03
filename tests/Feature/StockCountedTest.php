<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * stocks.counted_at: un producto tiene "inventario cargado" en una sucursal sólo
 * después de contarse ahí (ajuste, nota de entrada, movimiento manual, Excel).
 * Las ventas y las devoluciones de notas no cuentan.
 */
class StockCountedTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->branch = Branch::create(['name' => 'A']);
        $this->product = Product::create(['brand' => 'X', 'model' => 'M', 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'iva' => 0, 'extra' => 0, 'price' => 100, 'cost' => 50]);
    }

    private function counted(): bool
    {
        return Stock::where(['branch_id' => $this->branch->id, 'product_id' => $this->product->id])->value('counted_at') !== null;
    }

    private function sell(int $qty): Note
    {
        $item = ['brand' => 'X', 'model' => 'M', 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'quantity' => $qty, 'cost' => 50, 'price' => 100,
            'iva' => 0, 'extra' => 0, 'purchase_subtotal' => 50, 'sale_subtotal' => 100, 'supplied_status' => 'no_enviado',
            'delivery_status' => 'pendiente', 'product_id' => $this->product->id];
        $this->actingAs(User::factory()->create())->withSession(['branch_id' => $this->branch->id])->post('/nota', [
            'folio' => '1', 'customer' => 'c', 'date' => '2026-09-10', 'purchase_total' => 50, 'sale_total' => 100, 'flete' => 0,
            'branch_id' => $this->branch->id, 'delivery_status' => 'pendiente', 'status' => 'pending', 'purchase_status' => 'pending',
            'notes' => '', 'items' => [$item], 'payments' => [],
        ]);

        return Note::latest('id')->first();
    }

    public function test_sales_and_note_returns_do_not_count(): void
    {
        $note = $this->sell(2);
        $this->assertFalse($this->counted());
        $this->assertSame(-2.0, (float) Stock::sole()->quantity); // se vende aunque no haya inventario

        $this->actingAs(User::factory()->create())->withSession(['branch_id' => $this->branch->id])->post("/nota/{$note->id}/destroy");
        $this->assertFalse($this->counted()); // la devolución por eliminación no es un conteo
    }

    public function test_selling_without_loaded_stock_discounts_from_zero_and_reports_it(): void
    {
        // Sin existencias cargadas cuenta como 0: vender 3 deja -3, y así se reporta.
        $this->sell(3);

        $this->assertEquals(-3, Stock::where(['branch_id' => $this->branch->id, 'product_id' => $this->product->id])->value('quantity'));
        $this->assertFalse($this->counted(), 'sigue sin contarse: los avisos de "sólo hay N" no aplican');

        $user = User::factory()->create();
        $found = $this->actingAs($user)->getJson('/api/products/search?query=X&branch_id='.$this->branch->id)->json();
        $this->assertEquals(-3, $found[0]['branch_stock']);
        $this->assertNull($found[0]['branch_counted_at']);

        $stock = $this->actingAs($user)->getJson("/api/products/stock?branch_id={$this->branch->id}&ids[]={$this->product->id}")->json();
        $this->assertEquals(-3, $stock[$this->product->id]['quantity']);
        $this->assertFalse($stock[$this->product->id]['counted']);

        // Al cargar el conteo real, se toma ese número.
        (new StockService)->adjustStock($this->branch->id, $this->product->id, 10, 'ADJUSTMENT');
        $this->assertEquals(10, Stock::where(['branch_id' => $this->branch->id, 'product_id' => $this->product->id])->value('quantity'));
        $this->assertTrue($this->counted());
    }

    public function test_adjustment_counts(): void
    {
        (new StockService)->adjustStock($this->branch->id, $this->product->id, 7, 'ADJUSTMENT');
        $this->assertTrue($this->counted());
    }

    public function test_stock_entry_counts(): void
    {
        $this->actingAs(User::factory()->create())->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), ['date' => '2026-09-10', 'items' => [['product_id' => $this->product->id, 'quantity' => 3, 'cost' => 100]]])->assertSessionHasNoErrors();
        $this->assertTrue($this->counted());
    }

    public function test_manual_movement_from_the_product_counts_even_if_it_is_an_out(): void
    {
        $this->actingAs(User::factory()->create())->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-movements.store'), ['product_id' => $this->product->id, 'movement_type' => 'OUT', 'quantity' => 1]);
        $this->assertTrue($this->counted());
    }

    public function test_counted_at_keeps_the_first_count(): void
    {
        $this->travelTo(now()->subDays(3));
        (new StockService)->adjustStock($this->branch->id, $this->product->id, 7, 'ADJUSTMENT');
        $first = Stock::sole()->counted_at;
        $this->travelBack();

        (new StockService)->adjustStock($this->branch->id, $this->product->id, 9, 'ADJUSTMENT');
        $this->assertTrue($first->equalTo(Stock::sole()->counted_at));
    }

    public function test_stock_api_reports_counted(): void
    {
        $other = Product::create(['brand' => 'Y', 'model' => 'N', 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'iva' => 0, 'extra' => 0, 'price' => 1, 'cost' => 1]);
        $this->sell(1); // product: vendido, sin contar
        (new StockService)->adjustStock($this->branch->id, $other->id, 4, 'ADJUSTMENT');

        $this->getJson("/api/products/stock?branch_id={$this->branch->id}&ids[]={$this->product->id}&ids[]={$other->id}&ids[]=999")
            ->assertOk()
            ->assertExactJson([
                (string) $this->product->id => ['quantity' => -1, 'counted' => false],
                (string) $other->id => ['quantity' => 4, 'counted' => true],
                '999' => ['quantity' => null, 'counted' => false],
            ]);

        $search = collect($this->getJson("/api/products/search?query=N&branch_id={$this->branch->id}")->json())->firstWhere('model', 'N');
        $this->assertNotNull($search['branch_counted_at']);
    }
}
