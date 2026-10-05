<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Uso del sistema: sólo el super admin, y cuenta bien caja contra notas a mano. */
class UsageTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private User $admin;

    private User $cashier;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->admin = User::factory()->create();
        $this->admin->forceFill(['role' => User::SUPER_ADMIN])->save();
        $this->cashier = User::factory()->create(['name' => 'Cajera Ana']);
        $this->cashier->forceFill(['role' => User::CASHIER, 'permissions' => ['sales.cancel_own' => true]])->save();
        $this->cashier->branches()->sync([$this->a->id]);
        $this->product = Product::create(['brand' => 'CEMEX', 'model' => 'GRIS', 'measure' => '50KG', 'mc' => '', 'unit' => 'BULTO', 'iva' => 0, 'extra' => 0, 'price' => 100, 'cost' => 80]);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $this->product->id, 'quantity' => 50]);
    }

    private function sell(array $extra = []): void
    {
        $this->actingAs($this->cashier)->withSession(['branch_id' => $this->a->id])->post('/caja/ventas', [
            'items' => [['product_id' => $this->product->id, 'quantity' => 2]], 'cash_received' => 200,
        ] + $extra)->assertSessionHasNoErrors();
    }

    private function manualNote(Branch $branch, float $total): Note
    {
        $note = new Note(['folio' => 'M'.$total, 'customer' => 'X', 'date' => businessToday(), 'branch_id' => $branch->id, 'sale_total' => $total,
            'purchase_total' => 0, 'status' => 'paid', 'purchase_status' => 'paid', 'delivery_status' => 'entregado_a_cliente', 'flete' => 0]);
        $note->forceFill(['source' => Note::SOURCE_NOTA])->save();

        return $note;
    }

    public function test_only_the_super_admin_sees_it(): void
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => User::OWNER])->save();

        $this->actingAs($owner)->get(route('usage.index'))->assertNotFound();
        $this->actingAs($this->cashier)->get(route('usage.index'))->assertNotFound();
        $this->actingAs($this->admin)->get(route('usage.index'))->assertOk()->assertInertia(fn ($page) => $page->component('Usage/Index'));
    }

    public function test_caja_sales_are_marked_and_compared_with_manual_notes(): void
    {
        $this->sell();
        $this->sell(['credit' => true, 'cash' => 50, 'flete' => 30]);
        $this->sell();
        $canceled = Note::latest('id')->first();
        $this->actingAs($this->cashier)->withSession(['branch_id' => $this->a->id])
            ->post(route('caja.cancel', $canceled), ['reason' => 'Error al capturar'])->assertSessionHasNoErrors();
        $this->manualNote($this->a, 500);
        $this->manualNote($this->b, 300);

        $this->assertSame(3, Note::where('source', Note::SOURCE_CAJA)->count());

        $this->actingAs($this->admin)->get(route('usage.index'))->assertInertia(fn ($page) => $page
            ->where('kpis.caja_count', 2)              // la cancelada no cuenta
            ->where('kpis.caja_amount', 430)           // 200 + 230 (con flete)
            ->where('kpis.manual_count', 2)
            ->where('kpis.adoption', 50)
            ->where('kpis.sellers', 1)
            ->where('functions.credit', 1)
            ->where('functions.flete', 1)
            ->where('functions.canceled', 1)
            ->where('users.0.name', 'Cajera Ana')
            ->where('users.0.caja_count', 2)
            ->where('users.0.canceled', 1)
            ->where('daily.29.caja', 2)
            ->where('daily.29.nota', 2));

        // Por sucursal: B no tiene caja.
        $this->actingAs($this->admin)->get(route('usage.index', ['sucursal' => $this->b->id, 'dias' => 7]))->assertInertia(fn ($page) => $page
            ->where('period.days', 7)
            ->where('kpis.caja_count', 0)
            ->where('kpis.manual_count', 1)
            ->has('branches', 1)
            ->where('branches.0.name', 'B'));
    }

    public function test_credit_without_down_payment_paid_later_counts_as_credit_and_collection(): void
    {
        $this->travelTo(now()->subDays(2));
        $this->sell(['credit' => true]);
        $this->travelBack();
        $owner = User::factory()->create();
        $owner->forceFill(['role' => User::OWNER])->save();
        $this->actingAs($owner)->post(route('notes.collect', Note::sole()), ['method' => 'cash', 'amount' => 200])->assertSessionHasNoErrors();

        $this->actingAs($this->admin)->get(route('usage.index', ['dias' => 7]))->assertInertia(fn ($page) => $page
            ->where('functions.credit', 1)
            ->where('functions.collections', 1));
    }

    public function test_note_form_marks_its_notes_as_manual(): void
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => User::OWNER])->save();
        $this->actingAs($owner)->withSession(['branch_id' => $this->a->id])->post(route('notes.store'), [
            'folio' => '', 'customer' => 'Cliente', 'notes' => '', 'date' => businessToday(), 'branch_id' => $this->a->id,
            'sale_total' => 100, 'purchase_total' => 80, 'status' => 'paid', 'purchase_status' => 'paid',
            'delivery_status' => 'entregado_a_cliente', 'flete' => 0, 'source' => 'caja',
            'items' => [['product_id' => $this->product->id, 'brand' => 'CEMEX', 'model' => 'GRIS', 'measure' => '50KG', 'mc' => '', 'unit' => 'BULTO', 'quantity' => 1, 'cost' => 80, 'price' => 100, 'iva' => 0, 'extra' => 0, 'purchase_subtotal' => 80, 'sale_subtotal' => 100, 'supplied_status' => 'no_enviado', 'delivery_status' => 'entregado_a_cliente']],
            'payments' => [['date' => businessToday(), 'cash' => 100, 'card' => 0, 'transfer' => 0]],
        ])->assertSessionHasNoErrors();

        $this->assertSame(Note::SOURCE_NOTA, Note::sole()->source, 'el navegador no puede decir que fue de caja');
    }
}
