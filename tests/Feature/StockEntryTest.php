<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockEntry;
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
                'supplier' => 'Porcelanite',
                'reference' => 'Factura 123',
                'items' => [
                    ['product_id' => $a->id, 'quantity' => 10, 'cost' => 300, 'iva' => 16, 'extra' => 0],
                    ['product_id' => $b->id, 'quantity' => 2.5, 'cost' => 300, 'iva' => 16, 'extra' => 0],
                ],
            ])
            ->assertRedirect(route('stock-entries.show', StockEntry::sole()))
            ->assertSessionHasNoErrors();

        $this->assertEquals(15, Stock::where(['branch_id' => $this->branch->id, 'product_id' => $a->id])->value('quantity'));
        $this->assertEquals(2.5, Stock::where(['branch_id' => $this->branch->id, 'product_id' => $b->id])->value('quantity'));
        $this->assertFalse(Stock::where('branch_id', $this->otherBranch->id)->exists());

        $this->assertEquals(2, StockMovement::where(['branch_id' => $this->branch->id, 'movement_type' => 'IN'])->count());
        $entry = StockEntry::sole();
        $this->assertEquals('Nota de entrada #'.$entry->id.' - Porcelanite', StockMovement::first()->description);
    }

    public function test_entry_rejects_invalid_items_and_changes_nothing(): void
    {
        $a = $this->product();

        $this->actingAs($this->user)
            ->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), [
                'date' => '2026-09-30',
                'items' => [
                    ['product_id' => $a->id, 'quantity' => 3, 'cost' => 300],
                    ['product_id' => 9999, 'quantity' => 0, 'cost' => 300],
                ],
            ])
            ->assertSessionHasErrors(['items.1.product_id', 'items.1.quantity']);

        $this->assertEquals(0, Stock::count());
        $this->assertEquals(0, StockMovement::count());
        $this->assertEquals(0, StockEntry::count());
    }

    public function test_entry_is_saved_with_cost_iva_extra_and_the_total_to_pay(): void
    {
        $a = $this->product();
        $b = Product::create(['brand' => 'CASTEL', 'model' => 'MARMOL', 'measure' => '60x60', 'mc' => '1.44', 'unit' => 'CAJA', 'iva' => 16, 'extra' => 10, 'price' => 400, 'cost' => 200]);

        $this->actingAs($this->user)->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), [
                'date' => '2026-10-01', 'supplier' => ' Interceramic ', 'reference' => 'F-9', 'notes' => 'Llegó completo',
                'items' => [
                    ['product_id' => $a->id, 'quantity' => 10, 'cost' => 300, 'iva' => 16, 'extra' => 0],
                    // El costo del proveedor cambió: 220 en vez de 200.
                    ['product_id' => $b->id, 'quantity' => 4, 'cost' => 220, 'iva' => 16, 'extra' => 10],
                ],
            ])->assertSessionHasNoErrors();

        $entry = StockEntry::with('items')->sole();
        $this->assertSame('Interceramic', $entry->supplier);
        $this->assertSame('pending', $entry->status);
        $this->assertSame($this->user->id, $entry->user_id);
        // 10 × 300 × 1.16 = 3,480 · 4 × 220 × 1.16 × 1.10 = 1,122.88
        $this->assertEquals(3480, $entry->items[0]->subtotal);
        $this->assertEquals(1122.88, $entry->items[1]->subtotal);
        $this->assertEquals(4602.88, $entry->total);
        $this->assertSame('MARMOL', $entry->items[1]->model);
        $this->assertEquals(220, $entry->items[1]->cost);

        // Sin pedirlo, el catálogo no cambia.
        $this->assertEquals(200, $b->fresh()->cost);
    }

    public function test_branch_global_extra_wins_and_new_costs_can_update_the_catalog(): void
    {
        $this->branch->update(['extra_percentage' => 5]);
        $a = $this->product();

        $this->actingAs($this->user)->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), [
                'date' => '2026-10-01', 'paid' => true, 'update_catalog' => true,
                'items' => [['product_id' => $a->id, 'quantity' => 2, 'cost' => 350, 'iva' => 16, 'extra' => 50]],
            ])->assertSessionHasNoErrors();

        $entry = StockEntry::with('items')->sole();
        $this->assertSame('paid', $entry->status);
        $this->assertEquals(5, $entry->items[0]->extra, 'el extra global de la sucursal manda');
        $this->assertEquals(round(2 * 350 * 1.16 * 1.05, 2), $entry->total);
        $this->assertEquals(350, $a->fresh()->cost);
        $this->assertEquals(0, $a->fresh()->extra, 'con extra global no se toca el extra del producto');
    }

    public function test_list_is_scoped_to_the_branch_with_totals_and_filters(): void
    {
        $a = $this->product();
        $mk = fn (Branch $branch, string $supplier, float $total, string $status, string $date) => StockEntry::create(['branch_id' => $branch->id, 'date' => $date, 'supplier' => $supplier, 'total' => $total, 'status' => $status]);
        $mk($this->branch, 'Porcelanite', 1000, 'pending', '2026-10-01');
        $mk($this->branch, 'Interceramic', 500, 'paid', '2026-09-20');
        $mk($this->otherBranch, 'Otro', 9999, 'pending', '2026-10-01');

        $get = fn (array $q = []) => $this->actingAs($this->user)->withSession(['branch_id' => $this->branch->id])->get(route('stock-entries.index', $q));

        $get()->assertOk()->assertInertia(fn ($page) => $page->component('StockEntries/Index')
            ->has('pagination.data', 2)
            ->where('totals.total', 1500)->where('totals.pending', 1000)->where('totals.pending_count', 1));

        $get(['query' => 'porce'])->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.supplier', 'Porcelanite'));
        $get(['estado' => 'paid'])->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.supplier', 'Interceramic'));
        $get(['desde' => '2026-09-25'])->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('totals.total', 1000));
    }

    public function test_show_and_mark_paid_only_in_the_current_branch(): void
    {
        $mine = StockEntry::create(['branch_id' => $this->branch->id, 'date' => '2026-10-01', 'total' => 100]);
        $other = StockEntry::create(['branch_id' => $this->otherBranch->id, 'date' => '2026-10-01', 'total' => 100]);
        $as = fn () => $this->actingAs($this->user)->withSession(['branch_id' => $this->branch->id]);

        $as()->get(route('stock-entries.show', $mine))->assertOk()->assertInertia(fn ($page) => $page->component('StockEntries/Show')->where('entry.id', $mine->id));
        $as()->get(route('stock-entries.show', $other))->assertNotFound();

        $as()->patch(route('stock-entries.status', $mine), ['status' => 'paid'])->assertSessionHasNoErrors();
        $this->assertSame('paid', $mine->fresh()->status);
        $as()->patch(route('stock-entries.status', $other), ['status' => 'paid'])->assertNotFound();
        $this->assertSame('pending', $other->fresh()->status);
    }

    public function test_cashier_cannot_see_entries(): void
    {
        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => User::CASHIER])->save();
        $cashier->branches()->sync([$this->branch->id]);

        $this->actingAs($cashier)->withSession(['branch_id' => $this->branch->id])->get(route('stock-entries.index'))->assertForbidden();
    }

    public function test_entry_requires_at_least_one_item(): void
    {
        $this->actingAs($this->user)
            ->withSession(['branch_id' => $this->branch->id])
            ->post(route('stock-entries.store'), ['date' => '2026-09-30', 'items' => []])
            ->assertSessionHasErrors('items');
    }
}
