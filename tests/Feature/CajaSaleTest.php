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
        config(['features.discounts' => true]); // estas pruebas cubren los descuentos; ver test_discounts_off
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
        $this->assertSame('pending', $note->purchase_status, 'la compra al proveedor la liquida el dueño a mano');
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

    public function test_freight_is_added_to_the_total_and_charged(): void
    {
        // 1 × $245 + flete $150 = $395; con tarjeta $100, el efectivo cubre $295.
        $this->sell($this->cashier(), [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1]],
            'flete' => 150, 'card' => 100, 'card_type' => 'debito', 'cash_received' => 300,
        ])->assertSessionHasNoErrors()->assertSessionHas('lastSale.change', 5.0);

        $note = Note::sole();
        $this->assertEquals(150, $note->flete);
        $this->assertEquals(395, $note->sale_total);
        $this->assertEquals(295, $note->cash);
        $this->assertEquals(0, $note->balance);
        $this->assertSame('paid', $note->status);

        // A crédito el flete también entra al saldo.
        $this->sell($this->cashier(), [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1]],
            'flete' => 55.5, 'credit' => true, 'cash' => 100,
        ])->assertSessionHasNoErrors();
        $credit = Note::latest('id')->first();
        $this->assertEquals(300.5, $credit->sale_total);
        $this->assertEquals(200.5, $credit->balance);
        $this->assertSame('pending', $credit->status);
        $this->assertSame('pending', $credit->purchase_status);

        $this->sell($this->cashier(), [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1]],
            'flete' => -10, 'cash_received' => 245,
        ])->assertSessionHasErrors('flete');
    }

    public function test_cashier_can_type_the_line_amount_to_round_it(): void
    {
        // 3 cajas a $333.33 = $999.99: el cajero cierra el importe en $1,000.
        $tile = Product::create(['brand' => 'CASTEL', 'model' => 'MARMOL', 'measure' => '60x60', 'mc' => '1.44', 'unit' => 'CAJA', 'iva' => 0, 'extra' => 0, 'price' => 333.33, 'cost' => 200]);
        $this->sell($this->cashier(), [
            'items' => [['product_id' => $tile->id, 'quantity' => 3, 'amount' => 1000], ['product_id' => $this->cement->id, 'quantity' => 1]],
            'cash_received' => 1245,
        ])->assertSessionHasNoErrors()->assertSessionHas('lastSale.change', 0.0);

        $note = Note::sole();
        $this->assertEquals(1245, $note->sale_total);
        $line = NoteProduct::where('product_id', $tile->id)->sole();
        $this->assertEquals(1000, $line->sale_subtotal, 'el importe escrito manda');
        $this->assertEquals(333.33, $line->price, 'precio = importe ÷ cantidad');
        $this->assertEquals(333.33, $line->list_price);
        $this->assertEquals(333.33, $tile->fresh()->price, 'sin pedirlo, el catálogo no cambia');
    }

    public function test_typing_the_amount_needs_the_change_price_permission(): void
    {
        $cashier = $this->cashier(['sales.change_price' => false]);
        $this->sell($cashier, [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1, 'amount' => 240]],
            'cash_received' => 240,
        ])->assertSessionHasErrors('items.0.amount');
        $this->assertSame(0, Note::count());

        // El mismo importe que el catálogo no es un cambio.
        $this->sell($cashier, [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 2, 'amount' => 490]],
            'cash_received' => 490,
        ])->assertSessionHasNoErrors();
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
        $cashier = $this->cashier(['sales.change_price' => false]);
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
            'card' => 350, 'card_type' => 'credito', 'transfer' => 0, 'cash_received' => 4000,
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

    public function test_cashier_changes_price_by_default_and_can_save_it_to_the_catalog(): void
    {
        $cashier = $this->cashier();
        $item = ['product_id' => $this->cement->id, 'quantity' => 2];

        // Sólo en la venta: el catálogo no cambia.
        $this->sell($cashier, ['items' => [$item + ['price' => 260]], 'cash_received' => 520])->assertSessionHasNoErrors();
        $this->assertEquals(245, $this->cement->fresh()->price);
        $this->assertEquals(260, NoteProduct::latest('id')->first()->price);

        // Guardándolo como precio nuevo.
        $this->sell($cashier, ['items' => [$item + ['price' => 270, 'update_catalog' => true]], 'cash_received' => 540])
            ->assertSessionHasNoErrors()->assertSessionHas('lastSale.catalog_updated', 1);
        $this->assertEquals(270, $this->cement->fresh()->price);
        $this->assertEquals(245, NoteProduct::latest('id')->first()->list_price, 'la partida guarda el precio que tenía');

        // Sin el permiso de catálogo, no.
        $noCatalog = $this->cashier(['products.update_price' => false]);
        $this->sell($noCatalog, ['items' => [$item + ['price' => 300, 'update_catalog' => true]], 'cash_received' => 600])
            ->assertSessionHasErrors('items.0.price');
        $this->assertEquals(270, $this->cement->fresh()->price);
    }

    public function test_product_without_price_cannot_be_sold_at_zero(): void
    {
        $free = Product::create(['brand' => 'CASTEL', 'model' => 'NUEVO', 'measure' => '30x30', 'mc' => '1.5', 'unit' => 'CAJA', 'iva' => 0, 'extra' => 0, 'price' => 0, 'cost' => 100]);
        $cashier = $this->cashier();

        $this->sell($cashier, ['items' => [['product_id' => $free->id, 'quantity' => 1]], 'cash_received' => 100])
            ->assertSessionHasErrors(['items.0.price' => 'CASTEL NUEVO no tiene precio: escribe el precio.']);

        $this->sell($cashier, ['items' => [['product_id' => $free->id, 'quantity' => 1, 'price' => 180, 'update_catalog' => true]], 'cash_received' => 200])
            ->assertSessionHasNoErrors();
        $this->assertEquals(180, $free->fresh()->price);

        $locked = $this->cashier(['sales.change_price' => false]);
        Product::whereKey($free->id)->update(['price' => 0]);
        $this->sell($locked, ['items' => [['product_id' => $free->id, 'quantity' => 1]], 'cash_received' => 100])
            ->assertSessionHasErrors(['items.0.price' => 'CASTEL NUEVO no tiene precio: pide al encargado que se lo ponga.']);
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

    public function test_discounts_off_rejects_them_even_with_permission(): void
    {
        config(['features.discounts' => false]);
        $cashier = $this->cashier(['sales.discount' => true], max: 50);
        $item = ['product_id' => $this->cement->id, 'quantity' => 1];

        $this->sell($cashier, ['items' => [$item + ['discount' => 10]], 'cash_received' => 300])->assertSessionHasErrors('items.0.discount');
        $this->sell($cashier, ['items' => [$item], 'discount' => 10, 'cash_received' => 300])->assertSessionHasErrors('discount');
        $this->actingAs($cashier)->get('/caja')->assertInertia(fn ($page) => $page->where('rules.discount', false)->where('features.discounts', false));
        $this->assertSame(0, Note::count());
    }

    public function test_credit_sale_with_down_payment_stays_pending(): void
    {
        $cashier = $this->cashier();
        // 2 × $2,500 = 5,000; abona 1,000 en efectivo y 500 con tarjeta → debe 3,500.
        $this->sell($cashier, [
            'items' => [['product_id' => $this->tire->id, 'quantity' => 2]],
            'credit' => true, 'cash' => 1000, 'card' => 500, 'card_type' => 'credito',
            'customer' => 'Juan Pérez', 'customer_phone' => '712 111 2233', 'customer_address' => 'Calle 1, Centro',
        ])->assertSessionHasNoErrors()->assertSessionHas('lastSale.balance', 3500.0);

        $note = Note::sole();
        $this->assertSame('pending', $note->status);
        $this->assertEquals(1500, $note->advance);
        $this->assertEquals(3500, $note->balance);
        $this->assertEquals(1000, $note->cash);
        $this->assertNull($note->cash_received);
        $this->assertSame('712 111 2233', $note->customer_phone);
        $this->assertSame('Calle 1, Centro', $note->customer_address);
        $this->assertEquals(8, $this->stock($this->tire), 'a crédito también sale del inventario');

        // Mis ventas la marca a crédito, con lo que dejó a cuenta y lo que resta.
        $this->actingAs($cashier)->withSession(['branch_id' => $this->a->id])->get('/caja/ventas')->assertInertia(fn ($page) => $page
            ->where('sales.0.credit', true)->where('sales.0.balance', 3500)->where('sales.0.cash', 1000)->where('sales.0.card', 500));
    }

    public function test_credit_sale_without_payment_has_no_payment_row(): void
    {
        $this->sell($this->cashier(), [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1]],
            'credit' => true, 'customer' => 'Ana', 'customer_phone' => '7121234567',
        ])->assertSessionHasNoErrors();

        $note = Note::sole();
        $this->assertSame(0, $note->payments()->count());
        $this->assertEquals(245, $note->balance);
        $this->assertSame('pending', $note->status);
    }

    public function test_credit_sale_needs_permission_and_a_valid_down_payment(): void
    {
        $item = [['product_id' => $this->cement->id, 'quantity' => 1]];

        $this->sell($this->cashier(), ['items' => $item, 'credit' => true, 'cash' => 300])->assertSessionHasErrors('cash');

        $noCredit = $this->cashier(['sales.credit' => false]);
        $this->sell($noCredit, ['items' => $item, 'credit' => true])->assertSessionHasErrors('credit');

        $this->assertSame(0, Note::count());
    }

    public function test_credit_sale_does_not_require_customer_data(): void
    {
        // Como en las notas: basta con los productos; nombre, teléfono y dirección son opcionales.
        $this->sell($this->cashier(), [
            'items' => [['product_id' => $this->cement->id, 'quantity' => 1]],
            'credit' => true,
        ])->assertSessionHasNoErrors();

        $note = Note::sole();
        $this->assertSame('Público en general', $note->customer);
        $this->assertNull($note->customer_phone);
        $this->assertSame('pending', $note->status);
        $this->assertEquals(245, $note->balance);
    }

    public function test_payment_must_cover_the_total(): void
    {
        $cashier = $this->cashier();
        $item = [['product_id' => $this->cement->id, 'quantity' => 2]]; // 490

        $this->sell($cashier, ['items' => $item, 'cash_received' => 400])->assertSessionHasErrors('cash_received');
        $this->sell($cashier, ['items' => $item, 'card' => 500, 'card_type' => 'debito'])->assertSessionHasErrors('card');
        // Con tarjeta hay que decir si es de crédito o de débito.
        $this->sell($cashier, ['items' => $item, 'card' => 290, 'transfer' => 200])->assertSessionHasErrors('card_type');
        $this->sell($cashier, ['items' => $item, 'card' => 290, 'card_type' => 'tarjeta', 'transfer' => 200])->assertSessionHasErrors('card_type');
        $this->sell($cashier, ['items' => $item, 'card' => 290, 'card_type' => 'debito', 'transfer' => 200])->assertSessionHasNoErrors();
        $this->assertSame('debito', Note::latest('id')->first()->payments()->sole()->card_type);

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

    public function test_cashier_folio_is_always_automatic(): void
    {
        $cashier = $this->cashier();
        $item = [['product_id' => $this->cement->id, 'quantity' => 1]];
        $this->sell($cashier, ['items' => $item, 'cash_received' => 245]);
        $this->sell($cashier, ['items' => $item, 'cash_received' => 245, 'folio' => '500']); // se ignora
        $this->actingAs($cashier)->get('/caja')->assertInertia(fn ($page) => $page->where('rules.editFolio', false)->where('nextFolio', '3'));

        $this->assertSame(['1', '2'], Note::orderBy('id')->pluck('folio')->all());
    }

    public function test_folio_can_be_typed_with_permission(): void
    {
        $item = [['product_id' => $this->cement->id, 'quantity' => 1]];
        $this->sell($this->cashier(['sales.edit_folio' => true]), ['items' => $item, 'cash_received' => 245, 'folio' => '500']);
        $this->sell($this->cashier(), ['items' => $item, 'cash_received' => 245]);

        $owner = User::factory()->create();
        $this->actingAs($owner)->withSession(['branch_id' => $this->a->id])->post('/caja/ventas', ['items' => $item, 'cash_received' => 245, 'folio' => 'A-7']);

        $this->assertSame(['500', '501', 'A-7'], Note::orderBy('id')->pluck('folio')->all());
    }

    public function test_sales_history_shows_the_branch_without_costs_and_can_filter_mine(): void
    {
        $me = $this->cashier();
        $other = $this->cashier();
        $item = [['product_id' => $this->cement->id, 'quantity' => 1]];
        $this->sell($me, ['items' => $item, 'cash_received' => 245]);
        $this->sell($other, ['items' => $item, 'cash_received' => 245]);

        // Por omisión el cajero ve toda su sucursal.
        $this->actingAs($me)->get('/caja/ventas')->assertInertia(fn ($page) => $page
            ->has('sales', 2)
            ->where('onlyMine', false)
            ->missing('sales.0.purchase_total')
            // Resumen de la venta en la misma lista: partidas y pagos, sin costos.
            ->has('sales.0.lines', 1)
            ->where('sales.0.lines.0.amount', 245)
            ->where('sales.0.lines.0.quantity', 1)
            ->missing('sales.0.lines.0.cost')
            ->missing('sales.0.lines.0.purchase_subtotal')
            ->has('sales.0.payments', 1)
            ->where('sales.0.payments.0.cash', 245));
        $this->actingAs($me)->get('/caja/ventas?mias=1')->assertInertia(fn ($page) => $page
            ->has('sales', 1)
            ->where('sales.0.seller', $me->name)
            ->where('sales.0.is_mine', true));

        // Si se le quita el permiso, sólo las suyas.
        $this->actingAs($this->cashier(['sales.view_branch' => false]))->get('/caja/ventas')
            ->assertInertia(fn ($page) => $page->has('sales', 0)->where('onlyMine', true));

        $blind = $this->cashier(['sales.view_own' => false, 'sales.view_branch' => false]);
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

        // Sin motivo no se cancela.
        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar")->assertSessionHasErrors('reason');
        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar", ['reason' => '  '])->assertSessionHasErrors('reason');
        $this->assertSame('paid', $note->fresh()->status);

        $note->update(['notes' => 'Entregar en la tarde']);
        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar", ['reason' => 'El cliente se arrepintió'])->assertSessionHas('success');

        $note->refresh();
        // El motivo queda al final del comentario, con quién lo canceló; lo anterior se conserva.
        $this->assertStringStartsWith("Entregar en la tarde\nCANCELADA ", $note->notes);
        $this->assertStringEndsWith("por {$cashier->name}. Motivo: El cliente se arrepintió", $note->notes);
        $this->actingAs($cashier)->get('/caja/ventas')->assertInertia(fn ($page) => $page
            ->where('sales.0.cancel_reason', fn ($r) => str_ends_with($r, 'Motivo: El cliente se arrepintió')));
        $this->assertSame('cancelado', $note->delivery_status);
        $this->assertSame('canceled', $note->status);
        $this->assertSame(0, $note->payments()->count());
        $this->assertEquals(0, $note->cash);
        $this->assertEquals(10, $this->stock($this->tire));

        // Dos veces no: no vuelve a sumar inventario.
        $this->actingAs($cashier)->post("/caja/ventas/{$note->id}/cancelar", ['reason' => 'otra vez'])->assertForbidden();
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
