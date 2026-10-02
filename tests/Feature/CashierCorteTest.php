<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Corte;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** El cajero hace el corte del día de su sucursal sin ver nunca las compras. */
class CashierCorteTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private Note $note;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->note = Note::create(['folio' => '10', 'date' => '2026-09-10', 'branch_id' => $this->a->id, 'purchase_total' => 777.77, 'sale_total' => 1000,
            'status' => 'paid', 'purchase_status' => 'pending', 'delivery_status' => 'entregado_a_cliente', 'flete' => 0]);
        $this->note->payments()->create(['branch_id' => $this->a->id, 'date' => '2026-09-10', 'cash' => 1000, 'card' => 0, 'transfer' => 0, 'position' => 0]);
        $this->note->recalculateTotalsFromPayments();
    }

    private function cashier(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => User::CASHIER])->save();
        $user->branches()->sync([$this->a->id]);

        return $user;
    }

    private function payload(array $notes): array
    {
        return ['date' => '2026-09-10', 'sale_total' => 1000, 'notes_total' => 1000, 'cash_total' => 1000, 'card_total' => 0, 'transfer_total' => 0,
            'previous_notes_total' => 0, 'expenses_total' => 0, 'expenses' => '[]', 'returns' => '[]', 'previous_notes' => '[]',
            'notes' => json_encode($notes), 'branch_id' => $this->a->id];
    }

    public function test_cashier_never_receives_purchase_totals(): void
    {
        $cashier = $this->cashier();
        $as = fn () => $this->actingAs($cashier)->withSession(['branch_id' => $this->a->id]);

        $page = $as()->get('/cortes/crear?date=2026-09-10')->assertOk();
        $this->assertStringNotContainsString('777.77', json_encode($page->viewData('page')['props']));
        $this->assertStringNotContainsString('purchase_total', json_encode($page->viewData('page')['props']['notes']));

        $api = $as()->getJson("/api/notes/{$this->a->id}/2026-09-10")->assertOk()->getContent();
        $this->assertStringNotContainsString('777.77', $api);
        $this->assertStringNotContainsString('777.77', $as()->getJson("/api/notes/{$this->a->id}/searchByFolio/10")->getContent());

        // El dueño sí lo ve.
        $owner = User::factory()->create();
        $this->assertStringContainsString('777.77', $this->actingAs($owner)->getJson("/api/notes/{$this->a->id}/2026-09-10")->getContent());
    }

    public function test_cashier_saves_the_corte_and_the_server_fills_purchases_for_the_owner(): void
    {
        $cashier = $this->cashier();
        // El navegador del cajero no trae purchase_total (o trae uno falso): se toma de la base.
        $this->actingAs($cashier)->withSession(['branch_id' => $this->a->id])
            ->post('/cortes', $this->payload([[
                'id' => $this->note->id, 'folio' => '10', 'date' => '2026-09-10', 'advance' => 1000, 'balance' => 0, 'sale_total' => 1000,
                'cash' => 1000, 'card' => 0, 'transfer' => 0, 'purchase_total' => 1, 'status' => 'paid', 'delivery_status' => 'entregado_a_cliente',
            ]]))
            ->assertRedirect();

        $corte = Corte::sole();
        $this->assertEquals(777.77, $corte->notes[0]['purchase_total']);

        // El cajero lo abre y descarga sin compras; el dueño lo ve completo.
        $shown = $this->actingAs($cashier)->get("/corte/{$corte->id}")->assertOk();
        $this->assertStringNotContainsString('777.77', json_encode($shown->viewData('page')['props']));
        $this->actingAs($cashier)->get("/corte/download/{$corte->id}")->assertOk();

        $owner = User::factory()->create();
        $this->assertStringContainsString('777.77', json_encode($this->actingAs($owner)->get("/corte/{$corte->id}")->viewData('page')['props']));
    }

    public function test_cashier_cannot_touch_other_branches_nor_delete_or_weekly(): void
    {
        $cashier = $this->cashier();
        $corteB = Corte::create(['date' => '2026-09-10', 'sale_total' => 0, 'notes_total' => 0, 'cash_total' => 0, 'card_total' => 0, 'transfer_total' => 0,
            'previous_notes_total' => 0, 'expenses_total' => 0, 'expenses' => [], 'notes' => [], 'returns' => [], 'previous_notes' => [], 'branch_id' => $this->b->id]);

        $this->actingAs($cashier)->get("/corte/{$corteB->id}")->assertForbidden();
        $this->actingAs($cashier)->get("/corte/download/{$corteB->id}")->assertForbidden();
        $this->actingAs($cashier)->getJson("/api/notes/{$this->b->id}/2026-09-10")->assertForbidden();
        $this->actingAs($cashier)->post('/cortes', ['branch_id' => $this->b->id] + $this->payload([]))->assertForbidden();
        $this->actingAs($cashier)->delete("/corte/{$corteB->id}")->assertForbidden();
        $this->actingAs($cashier)->get('/corte_semanales/crear')->assertForbidden();
        $this->assertSame(1, Corte::count());
    }
}
