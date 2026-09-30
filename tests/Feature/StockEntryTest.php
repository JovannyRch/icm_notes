<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockEntryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Branch $branch;

    private Branch $otherBranch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->branch = Branch::create(['name' => 'Sucursal A']);
        $this->otherBranch = Branch::create(['name' => 'Sucursal B']);
    }

    private function product(): Product
    {
        return Product::create([
            'brand' => 'Marca', 'model' => 'Modelo', 'measure' => '20x30', 'mc' => '1',
            'unit' => 'PZA', 'iva' => 16, 'extra' => 0, 'price' => 500, 'cost' => 300,
        ]);
    }

    public function test_entry_adds_stock_to_current_branch_only(): void
    {
        $a = $this->product();
        $b = $this->product();
        Stock::create(['branch_id' => $this->branch->id, 'product_id' => $a->id, 'quantity' => 5]);

        $this->actingAs($this->user)
            ->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), [
                'date' => '2026-09-30',
                'reference' => 'Factura 123',
                'items' => [
                    ['product_id' => $a->id, 'quantity' => 10],
                    ['product_id' => $b->id, 'quantity' => 2.5],
                ],
            ])
            ->assertRedirect(route('stock-entries.create'))
            ->assertSessionHasNoErrors();

        $this->assertEquals(15, Stock::where(['branch_id' => $this->branch->id, 'product_id' => $a->id])->value('quantity'));
        $this->assertEquals(2.5, Stock::where(['branch_id' => $this->branch->id, 'product_id' => $b->id])->value('quantity'));
        $this->assertFalse(Stock::where('branch_id', $this->otherBranch->id)->exists());

        $this->assertEquals(2, StockMovement::where(['branch_id' => $this->branch->id, 'movement_type' => 'IN'])->count());
        $this->assertEquals('Nota de entrada 2026-09-30 - Factura 123', StockMovement::first()->description);
    }

    public function test_entry_rejects_invalid_items_and_changes_nothing(): void
    {
        $a = $this->product();

        $this->actingAs($this->user)
            ->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), [
                'date' => '2026-09-30',
                'items' => [
                    ['product_id' => $a->id, 'quantity' => 3],
                    ['product_id' => 9999, 'quantity' => 0],
                ],
            ])
            ->assertSessionHasErrors(['items.1.product_id', 'items.1.quantity']);

        $this->assertEquals(0, Stock::count());
        $this->assertEquals(0, StockMovement::count());
    }

    public function test_entry_requires_at_least_one_item(): void
    {
        $this->actingAs($this->user)
            ->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), ['date' => '2026-09-30', 'items' => []])
            ->assertSessionHasErrors('items');
    }
}
