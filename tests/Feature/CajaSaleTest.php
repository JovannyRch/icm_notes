<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Venta de caja: el servidor calcula y valida todo (precios, descuentos, tope, pago, inventario). */
class CajaSaleTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private Product $tire;

    private Product $cement;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->tire = Product::create(['brand' => 'MICHELIN', 'model' => 'P4', 'measure' => '205', 'mc' => '', 'unit' => 'PZA', 'iva' => 16, 'extra' => 5, 'price' => 2500, 'cost' => 1800]);
        $this->cement = Product::create(['brand' => 'CEMEX', 'model' => 'GRIS', 'measure' => '50KG', 'mc' => '', 'unit' => 'BULTO', 'iva' => 0, 'extra' => 0, 'price' => 245, 'cost' => 190]);
        foreach ([$this->tire, $this->cement] as $p) {
            Stock::create(['branch_id' => $this->a->id, 'product_id' => $p->id, 'quantity' => 10]);
        }
    }

    private function cashier(array $permissions = [], ?float $max = null): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => User::CASHIER, 'permissions' => $permissions ?: null, 'max_discount_percent' => $max])->save();
        $user->branches()->sync([$this->a->id]);

        return $user;
    }

    private function sell(User $user, array $payload)
    {
        return $this->actingAs($user)->withSession(['branch_id' => $this->a->id])->post('/caja/ventas', $payload);
    }

    private function stock(Product $p): float
    {
        return (float) Stock::where(['branch_id' => $this->a->id, 'product_id' => $p->id])->value('quantity');
    }

    public function test_cashier_sells_at_catalog_price_and_the_server_computes_everything(): void
    {
        $cashier = $this->cashier();

        $this->sell($cashier, [
            'items' => [['product_id' => $this->tire->id, 'quantity' => 2], ['product_id' => $this->cement->id, 'quantity' => 3]],
            'cash_received' => 6000,
        ])->assertRedirect(route('caja'))->assertSessionHas('lastSale.change', 265.0);

        $note = Note::sole();
        $this->assertEquals(5735, $note->sale_total);           // 2×2500 + 3×245
        $this->assertEquals(5735, $note->cash);
        $this->assertEquals(0, $note->balance);
        $this->assertEquals(6000, $note->cash_received);
        $this->assertSame('paid', $note->status);
        $this->assertSame('entregado_a_cliente', $note->delivery_status);
        $this->assertSame('Público en general', $note->customer);
        $this->assertSame($cashier->id, $note->user_id);
        $this->assertSame('1', $note->folio);
        $this->assertSame(businessToday(), (string) $note->date);

        // Costo con IVA y extra, como calculatePurchaseSubtotal(): 1800×2×1.16×1.05 + 190×3.
        $this->assertEquals(round(1800 * 2 * 1.16 * 1.05 + 570, 2), $note->purchase_total);
        $this->assertSame(1, $note->payments()->count());

        $this->assertEquals(8, $this->stock($this->tire));
        $this->assertEquals(7, $this->stock($this->cement));
    }

    public function test_browser_totals_are_ignored(): void
    {
        $this->sell($this->cashier(), [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1, 'sale_subtotal' => 1, 'cost' => 0]],
            'sale_total' => 1, 'cash_received' => 245,
        ])->assertSessionHasNoErrors();

        $this->assertEquals(245, Note::sole()->sale_total);
        $this->assertEquals(190, NoteProduct::sole()->purchase_subtotal);
    }

    public function test_price_change_and_discounts_need_permission(): void
    {
        $cashier = $this->cashier();
        $item = ['product_id' => $this->cement->id, 'quantity' => 1];

        $this->sell($cashier, ['items' => [$item + ['price' => 200]], 'cash_received' => 300])->assertSessionHasErrors('items.0.price');
        $this->sell($cashier, ['items' => [$item + ['discount' => 10]], 'cash_received' => 300])->assertSessionHasErrors('items.0.discount');
        $this->sell($cashier, ['items' => [$item], 'discount' => 10, 'cash_received' => 300])->assertSessionHasErrors('discount');
        // Mandar el mismo precio de catálogo no es "cambiarlo".
        $this->sell($cashier, ['items' => [$item + ['price' => '245.00']], 'cash_received' => 300])->assertSessionHasNoErrors();

        $this->assertSame(1, Note::count());
        $this->assertEquals(9, $this->stock($this->cement));
    }

    public function test_cashier_with_permissions_changes_price_and_discounts_within_the_cap(): void
    {
        $cashier = $this->cashier(['sales.change_price' => true, 'sales.discount' => true], max: 10);

        // 2 × $2,400 (precio cambiado) = 4800; −$200 en la partida; −$250 al total = 4350. Descuento 450/4800 = 9.4%.
        $this->sell($cashier, [
            'items' => [['product_id' => $this->tire->id, 'quantity' => 2, 'price' => 2400, 'discount' => 200]],
            'discount' => 250,
            'card' => 350, 'transfer' => 0, 'cash_received' => 4000,
        ])->assertSessionHasNoErrors()->assertSessionHas('lastSale.change', 0.0);

        $note = Note::sole();
        $this->assertEquals(4350, $note->sale_total);
        $this->assertEquals(250, $note->discount);
        $this->assertEquals(350, $note->card);
        $this->assertEquals(4000, $note->cash);
        $item = NoteProduct::sole();
        $this->assertEquals(2400, $item->price);
        $this->assertEquals(2500, $item->list_price);
        $this->assertEquals(200, $item->discount);
        $this->assertEquals(4600, $item->sale_subtotal);
    }

    public function test_discount_cap_counts_item_and_total_discounts_together(): void
    {
        $cashier = $this->cashier(['sales.discount' => true], max: 10);

        // 6% en la partida + 5% al total = 11% > 10%.
        $this->sell($cashier, [
            'items' => [['product_id' => $this->tire->id, 'quantity' => 1, 'discount' => 150]],
            'discount' => 125, 'cash_received' => 5000,
        ])->assertSessionHasErrors(['discount' => 'Tu tope de descuento es 10% (esta venta lleva 11.0%).']);

        $this->assertSame(0, Note::count());
        $this->assertEquals(10, $this->stock($this->tire));
    }

    public function test_owner_has_no_discount_cap(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->withSession(['branch_id' => $this->a->id])->post('/caja/ventas', [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1]], 'discount' => 200, 'cash_received' => 45,
        ])->assertSessionHasNoErrors();
        $this->assertEquals(45, Note::sole()->sale_total);
    }

    public function test_payment_must_cover_the_total(): void
    {
        $cashier = $this->cashier();
        $item = [['product_id' => $this->cement->id, 'quantity' => 2]]; // 490

        $this->sell($cashier, ['items' => $item, 'cash_received' => 400])->assertSessionHasErrors('cash_received');
        $this->sell($cashier, ['items' => $item, 'card' => 500])->assertSessionHasErrors('card');
        $this->sell($cashier, ['items' => $item, 'card' => 290, 'transfer' => 200])->assertSessionHasNoErrors();

        $note = Note::sole();
        $this->assertEquals(0, $note->cash);
        $this->assertNull($note->cash_received);
        $this->assertEquals(0, $note->balance);
    }

    public function test_sale_is_always_in_the_session_branch_the_cashier_can_access(): void
    {
        $cashier = $this->cashier();
        // Intenta vender en B (no asignada): currentBranchId() la regresa a A.
        $this->actingAs($cashier)->withSession(['branch_id' => $this->b->id])->post('/caja/ventas', [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1]], 'cash_received' => 245, 'branch_id' => $this->b->id,
        ])->assertSessionHasNoErrors();

        $this->assertSame($this->a->id, Note::sole()->branch_id);
    }

    public function test_folio_is_automatic_or_the_typed_one(): void
    {
        $cashier = $this->cashier();
        $item = [['product_id' => $this->cement->id, 'quantity' => 1]];
        $this->sell($cashier, ['items' => $item, 'cash_received' => 245]);
        $this->sell($cashier, ['items' => $item, 'cash_received' => 245, 'folio' => '500']);
        $this->sell($cashier, ['items' => $item, 'cash_received' => 245]);

        $this->assertSame(['1', '500', '501'], Note::orderBy('id')->pluck('folio')->all());
    }

    public function test_sales_history_shows_own_sales_without_costs(): void
    {
        $me = $this->cashier();
        $other = $this->cashier();
        $item = [['product_id' => $this->cement->id, 'quantity' => 1]];
        $this->sell($me, ['items' => $item, 'cash_received' => 245]);
        $this->sell($other, ['items' => $item, 'cash_received' => 245]);

        $this->actingAs($me)->get('/caja/ventas')->assertInertia(fn ($page) => $page
            ->has('sales', 1)
            ->where('sales.0.seller', $me->name)
            ->missing('sales.0.purchase_total'));

        $boss = $this->cashier(['sales.view_branch' => true]);
        $this->actingAs($boss)->get('/caja/ventas')->assertInertia(fn ($page) => $page->has('sales', 2));

        $blind = $this->cashier(['sales.view_own' => false]);
        $this->actingAs($blind)->get('/caja/ventas')->assertForbidden();
    }

    public function test_cancel_own_sale_of_the_day_returns_stock_and_removes_payment(): void
    {
        $cashier = $this->cashier(['sales.cancel_own' => true]);
        $this->sell($cashier, ['items' => [['product_id' => $this->tire->id, 'quantity' => 3]], 'cash_received' => 7500]);
        $note = Note::sole();
        $this->assertEquals(7, $this->stock($this->tire));

        // Otro cajero (aunque tenga el permiso) no puede cancelarla.
        $this->actingAs($this->cashier(['sales.cancel_own' => true]))->post("/caja/ventas/{$note->id}/cancelar")->assertForbidden();
        // Sin permiso, tampoco la suya.
        $cashier->forceFill(['permissions' => ['sales.cancel_own' => false]])->save();
        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar")->assertForbidden();
        $cashier->forceFill(['permissions' => ['sales.cancel_own' => true]])->save();

        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar")->assertSessionHas('success');

        $note->refresh();
        $this->assertSame('cancelado', $note->delivery_status);
        $this->assertSame('canceled', $note->status);
        $this->assertSame(0, $note->payments()->count());
        $this->assertEquals(0, $note->cash);
        $this->assertEquals(10, $this->stock($this->tire));

        // Dos veces no: no vuelve a sumar inventario.
        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar")->assertForbidden();
        $this->assertEquals(10, $this->stock($this->tire));
    }

    public function test_cannot_cancel_a_sale_from_another_day(): void
    {
        $cashier = $this->cashier(['sales.cancel_own' => true]);
        $this->sell($cashier, ['items' => [['product_id' => $this->cement->id, 'quantity' => 1]], 'cash_received' => 245]);
        $note = Note::sole();
        $note->update(['date' => '2026-01-01']);

        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar")->assertForbidden();
    }

    public function test_cashier_search_shows_stock_only_with_permission_and_never_costs(): void
    {
        $withStock = $this->cashier();
        $res = $this->actingAs($withStock)->getJson('/api/products/search?query=CEMEX&branch_id='.$this->a->id)->assertOk()->json();
        $this->assertEquals(10, $res[0]['branch_stock']);
        $this->assertArrayNotHasKey('cost', $res[0]);

        // Otra sucursal (no asignada): no recibe sus existencias.
        $res = $this->actingAs($withStock)->getJson('/api/products/search?query=CEMEX&branch_id='.$this->b->id)->json();
        $this->assertArrayNotHasKey('branch_stock', $res[0]);

        $noStock = $this->cashier(['stock.view' => false]);
        $res = $this->actingAs($noStock)->getJson('/api/products/search?query=CEMEX&branch_id='.$this->a->id)->json();
        $this->assertArrayNotHasKey('branch_stock', $res[0]);
    }
}
