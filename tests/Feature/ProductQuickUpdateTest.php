<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Edición rápida en la lista de productos: un campo por petición, JSON, existencias por sucursal. */
class ProductQuickUpdateTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private Product $product;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->product = Product::create(['brand' => 'X', 'model' => 'M', 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'iva' => 16, 'extra' => 0, 'price' => 100, 'cost' => 50]);
        $this->owner = User::factory()->create();
    }

    private function patchField(string $field, $value, ?User $user = null, ?Branch $branch = null)
    {
        return $this->actingAs($user ?? $this->owner)->withSession(['branch_id' => ($branch ?? $this->a)->id])
            ->patchJson("/productos/{$this->product->id}/rapido", ['field' => $field, 'value' => $value]);
    }

    public function test_updates_price_cost_iva_and_extra(): void
    {
        $this->patchField('price', '125.50')->assertOk()->assertJsonPath('price', 125.5);
        $this->patchField('cost', 60)->assertOk();
        $this->patchField('iva', 0)->assertOk();
        $this->patchField('extra', 7.5)->assertOk()->assertJsonPath('extra', 7.5);

        $this->product->refresh();
        $this->assertEquals([125.5, 60, 0, 7.5], [$this->product->price, $this->product->cost, $this->product->iva, $this->product->extra]);
    }

    public function test_stock_is_an_adjustment_in_the_active_branch_only(): void
    {
        $this->patchField('stock', 12, branch: $this->b)->assertOk()->assertJsonPath('stock.quantity', 12);

        $stock = Stock::where(['branch_id' => $this->b->id, 'product_id' => $this->product->id])->sole();
        $this->assertEquals(12, $stock->quantity);
        $this->assertNotNull($stock->counted_at, 'cuenta como inventario cargado');
        $this->assertNull(Stock::where('branch_id', $this->a->id)->first());
        $this->assertSame('ADJUSTMENT', StockMovement::sole()->movement_type);

        // El mismo número otra vez no agrega movimiento.
        $this->patchField('stock', 12, branch: $this->b)->assertOk();
        $this->assertSame(1, StockMovement::count());
    }

    public function test_rejects_other_fields_and_invalid_values(): void
    {
        $this->patchField('brand', 'Y')->assertUnprocessable()->assertJsonValidationErrors('field');
        $this->patchField('price', -1)->assertUnprocessable()->assertJsonValidationErrors('value');
        $this->patchField('price', 'abc')->assertUnprocessable();
        $this->patchField('price', '')->assertUnprocessable();
        $this->assertEquals(100, $this->product->fresh()->price);
    }

    public function test_cashier_cannot_quick_edit(): void
    {
        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => User::CASHIER])->save();
        $cashier->branches()->sync([$this->a->id]);

        $this->patchField('price', 1, $cashier)->assertForbidden();
        $this->assertEquals(100, $this->product->fresh()->price);
    }
}
