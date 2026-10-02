<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\User;
use App\Services\CortePaymentsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Notas por cobrar en el dashboard y cobro rápido (abono o liquidar). */
class NoteCollectTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->owner = User::factory()->create();
    }

    private function note(float $total, float $paid = 0, string $status = 'pending', string $date = '2026-09-01'): Note
    {
        $note = Note::create(['folio' => (string) random_int(100, 99999), 'date' => $date, 'branch_id' => $this->a->id, 'purchase_total' => 0,
            'sale_total' => $total, 'status' => $status, 'purchase_status' => 'pending', 'delivery_status' => 'entregado_a_cliente', 'flete' => 0,
            'customer' => 'Juan', 'customer_phone' => '712 000 1111']);
        if ($paid > 0) {
            $note->payments()->create(['branch_id' => $this->a->id, 'date' => $date, 'cash' => $paid, 'card' => 0, 'transfer' => 0, 'position' => 0]);
        }
        $note->recalculateTotalsFromPayments();

        return $note->fresh();
    }

    private function collect(Note $note, array $data)
    {
        return $this->actingAs($this->owner)->from('/dashboard')->post("/nota/{$note->id}/cobrar", $data);
    }

    public function test_partial_payment_keeps_it_pending_and_goes_into_todays_corte(): void
    {
        $note = $this->note(1000, 200);

        $this->collect($note, ['method' => 'transfer', 'amount' => 300])->assertRedirect('/dashboard')->assertSessionHas('success');

        $note->refresh();
        $this->assertEquals(500, $note->balance);
        $this->assertSame('pending', $note->status);
        $payment = $note->payments()->reorder('position', 'desc')->first();
        $this->assertSame(businessToday(), $payment->date->toDateString());
        $this->assertEquals(300, $payment->transfer);
        $this->assertSame(1, $payment->position);

        // Entra al corte de hoy como entrada de una nota anterior.
        $corte = app(CortePaymentsService::class)->forBranchAndDate($this->a->id, businessToday());
        $this->assertEquals(300, collect($corte['previous_payments'])->sum('transfer'));
    }

    public function test_paying_the_rest_marks_it_paid(): void
    {
        $note = $this->note(1000, 200);
        $this->collect($note, ['method' => 'cash', 'amount' => 800])->assertSessionHas('success', "Nota {$note->folio} pagada.");

        $note->refresh();
        $this->assertEquals(0, $note->balance);
        $this->assertSame('paid', $note->status);
    }

    public function test_pending_note_without_balance_is_just_marked_paid(): void
    {
        $note = $this->note(500, 500); // pagada, pero sin marcar
        $this->collect($note, ['method' => 'cash', 'amount' => 0])->assertSessionHas('success');

        $this->assertSame('paid', $note->fresh()->status);
        $this->assertSame(1, $note->payments()->count(), 'no agrega un pago en cero');
    }

    public function test_rejects_overpayment_empty_amount_and_canceled_notes(): void
    {
        $note = $this->note(1000, 200);
        $this->collect($note, ['method' => 'cash', 'amount' => 900])->assertSessionHasErrors('amount');
        $this->collect($note, ['method' => 'cash', 'amount' => 0])->assertSessionHasErrors('amount');
        $this->collect($note, ['method' => 'cheque', 'amount' => 10])->assertSessionHasErrors('method');

        $canceled = $this->note(300, 0);
        $canceled->update(['delivery_status' => 'cancelado', 'status' => 'canceled']);
        $this->collect($canceled, ['method' => 'cash', 'amount' => 100])->assertSessionHas('error');

        $this->assertSame(1, $note->payments()->count());
    }

    public function test_cashier_cannot_collect(): void
    {
        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => User::CASHIER])->save();
        $cashier->branches()->sync([$this->a->id]);
        $note = $this->note(100);

        $this->actingAs($cashier)->post("/nota/{$note->id}/cobrar", ['method' => 'cash', 'amount' => 100])->assertForbidden();
    }

    public function test_dashboard_lists_pending_notes_with_customer_contact(): void
    {
        $owes = $this->note(1000, 200, date: '2026-08-01');
        $unmarked = $this->note(500, 500, date: '2026-09-15');
        $this->note(700, 700, status: 'paid'); // pagada: no aparece

        $this->actingAs($this->owner)->get('/dashboard')->assertInertia(fn ($page) => $page
            ->where('receivables.pending_count', 2)
            ->where('receivables.notes_count', 1)
            ->where('receivables.total', 800)
            ->where('receivables.oldest.0.id', $owes->id)
            ->where('receivables.oldest.0.customer_phone', '712 000 1111')
            ->where('receivables.oldest.1.id', $unmarked->id));
    }

    public function test_note_form_saves_customer_phone_and_address(): void
    {
        $item = ['brand' => 'X', 'model' => 'M', 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'quantity' => 1, 'cost' => 1, 'price' => 10,
            'iva' => 0, 'extra' => 0, 'purchase_subtotal' => 1, 'sale_subtotal' => 10, 'supplied_status' => 'no_enviado', 'delivery_status' => 'pendiente', 'product_id' => null];
        $this->actingAs($this->owner)->withSession(['branch_id' => $this->a->id])->post('/nota', [
            'folio' => '9', 'customer' => 'Ana', 'customer_phone' => '712 333 4444', 'customer_address' => 'Av. Juárez 10',
            'date' => '2026-09-10', 'purchase_total' => 1, 'sale_total' => 10, 'flete' => 0, 'branch_id' => $this->a->id,
            'delivery_status' => 'pendiente', 'status' => 'pending', 'purchase_status' => 'pending', 'notes' => '', 'items' => [$item], 'payments' => [],
        ])->assertSessionHasNoErrors();

        $note = Note::where('folio', '9')->sole();
        $this->assertSame('712 333 4444', $note->customer_phone);
        $this->assertSame('Av. Juárez 10', $note->customer_address);

        $this->actingAs($this->owner)->get("/nota/{$note->id}/ticket")->assertSee('Tel.: 712 333 4444')->assertSee('Dirección: Av. Juárez 10')
            ->assertSee('Saldo pendiente');
    }
}
