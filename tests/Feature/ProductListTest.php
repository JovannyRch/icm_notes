<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Lista de productos del dueño: filtros de estado con conteos, orden, ajuste masivo de precios y duplicar. */
class ProductListTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->owner = User::factory()->create();
    }

    private function product(string $model, float $price, float $cost, array $extra = []): Product
    {
        return Product::create(array_merge(['brand' => 'CASTEL', 'model' => $model, 'unit' => 'CAJA', 'mc' => '1.44', 'iva' => 16, 'extra' => 0, 'price' => $price, 'cost' => $cost], $extra));
    }

    private function list(array $query = [])
    {
        return $this->actingAs($this->owner)->withSession(['branch_id' => $this->a->id])->get(route('products', $query));
    }

    public function test_status_counts_and_filters_use_the_session_branch(): void
    {
        $ok = $this->product('OK', 200, 100);                 // costo real 116: margen sano
        $loss = $this->product('PERDIDA', 110, 100);          // 110 < 116
        $noPrice = $this->product('SINPRECIO', 0, 100);
        $noCost = $this->product('SINCOSTO', 150, 0);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $ok->id, 'quantity' => 5, 'counted_at' => now()]);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $loss->id, 'quantity' => 0, 'counted_at' => now()]);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $noCost->id, 'quantity' => -2]); // vendido sin contar
        // Otra sucursal: no cuenta.
        Stock::create(['branch_id' => $this->b->id, 'product_id' => $noPrice->id, 'quantity' => 50, 'counted_at' => now()]);

        $this->list()->assertInertia(fn ($page) => $page
            ->component('Products/Index')
            ->where('summary.total', 4)
            ->where('summary.sin_precio', 1)
            ->where('summary.sin_costo', 1)
            ->where('summary.con_perdida', 1)
            ->where('summary.agotados', 2)
            ->where('summary.con_existencias', 1)
            ->where('summary.sin_inventario', 1)
            ->where('summary.stock_units', 5)
            ->where('summary.stock_price', 1000)
            ->where('summary.stock_cost', 580)
        );

        $this->list(['estado' => 'con_perdida'])->assertInertia(fn ($page) => $page
            ->has('pagination.data', 1)->where('pagination.data.0.model', 'PERDIDA'));
        $this->list(['estado' => 'agotados', 'sort' => 'marca'])->assertInertia(fn ($page) => $page
            ->has('pagination.data', 2)->where('pagination.data.0.model', 'PERDIDA')->where('pagination.data.1.model', 'SINCOSTO'));
        $this->list(['estado' => 'sin_inventario'])->assertInertia(fn ($page) => $page
            ->has('pagination.data', 1)->where('pagination.data.0.model', 'SINPRECIO'));
        // La búsqueda acota los conteos.
        $this->list(['query' => 'sin'])->assertInertia(fn ($page) => $page->where('summary.total', 2)->where('summary.con_perdida', 0));
    }

    public function test_global_branch_extra_replaces_the_product_extra_for_the_margin(): void
    {
        $this->product('JUSTO', 125, 100, ['extra' => 0]); // costo real 116 sin extra global
        $this->a->update(['extra_percentage' => 10]);       // 116 × 1.10 = 127.6 > 125

        $this->list(['estado' => 'con_perdida'])->assertInertia(fn ($page) => $page->has('pagination.data', 1));
    }

    public function test_sort_by_price_and_stock(): void
    {
        $cheap = $this->product('BARATO', 100, 50);
        $expensive = $this->product('CARO', 900, 50);
        $none = $this->product('NADA', 500, 50);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $cheap->id, 'quantity' => 30, 'counted_at' => now()]);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $expensive->id, 'quantity' => 2, 'counted_at' => now()]);

        $this->list(['sort' => 'precio_desc'])->assertInertia(fn ($page) => $page->where('pagination.data.0.model', 'CARO')->where('pagination.data.2.model', 'BARATO'));
        $this->list(['sort' => 'existencias'])->assertInertia(fn ($page) => $page->where('pagination.data.0.model', 'BARATO')->where('pagination.data.2.model', 'NADA'));
    }

    public function test_bulk_price_by_percent_with_rounding_on_selected_products(): void
    {
        $p1 = $this->product('UNO', 389, 200);
        $p2 = $this->product('DOS', 0, 200);   // sin precio: no cambia con %
        $p3 = $this->product('TRES', 100, 50); // no seleccionado

        $this->actingAs($this->owner)->post(route('products.bulk-price'), [
            'ids' => [$p1->id, $p2->id], 'field' => 'price', 'mode' => 'percent', 'value' => 8, 'round' => 'peso',
        ])->assertSessionHas('success', fn ($m) => str_contains($m, '1 producto') && str_contains($m, '1 sin cambio'));

        $this->assertEquals(420, $p1->fresh()->price); // 389 × 1.08 = 420.12
        $this->assertEquals(0, $p2->fresh()->price);
        $this->assertEquals(100, $p3->fresh()->price);
    }

    public function test_bulk_cost_by_amount_for_a_brand_never_goes_negative(): void
    {
        $p1 = $this->product('UNO', 300, 100);
        $p2 = $this->product('DOS', 300, 10);
        $other = $this->product('OTRA', 300, 100, ['brand' => 'OTRA']);

        $this->actingAs($this->owner)->post(route('products.bulk-price'), [
            'brand' => 'CASTEL', 'field' => 'cost', 'mode' => 'amount', 'value' => -20, 'round' => 'none',
        ])->assertSessionHas('success');

        $this->assertEquals(80, $p1->fresh()->cost);
        $this->assertEquals(10, $p2->fresh()->cost); // quedaría en -10: se deja igual
        $this->assertEquals(100, $other->fresh()->cost);
    }

    public function test_bulk_price_validation_and_permission(): void
    {
        $p = $this->product('UNO', 100, 50);

        $this->actingAs($this->owner)->post(route('products.bulk-price'), ['field' => 'price', 'mode' => 'percent', 'value' => 5, 'round' => 'none'])
            ->assertSessionHasErrors('ids');
        $this->actingAs($this->owner)->post(route('products.bulk-price'), ['ids' => [$p->id], 'field' => 'price', 'mode' => 'percent', 'value' => -100, 'round' => 'none'])
            ->assertSessionHasErrors('value');

        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => 'cashier'])->save();
        $cashier->branches()->attach($this->a->id);
        $this->actingAs($cashier)->post(route('products.bulk-price'), ['ids' => [$p->id], 'field' => 'price', 'mode' => 'percent', 'value' => 5, 'round' => 'none'])
            ->assertForbidden();
        $this->assertEquals(100, $p->fresh()->price);
    }

    public function test_duplicate_prefills_the_form_without_stock(): void
    {
        $p = $this->product('MARMOL', 389, 200, ['measure' => '60X60']);

        $this->actingAs($this->owner)->get(route('products.create', ['duplicar' => $p->id]))
            ->assertInertia(fn ($page) => $page->component('Products/Form')
                ->where('duplicate.model', 'MARMOL')->where('duplicate.mc', '1.44')->where('duplicate.price', 389)->missing('duplicate.id'));
    }
}
