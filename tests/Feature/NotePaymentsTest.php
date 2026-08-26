<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotePaymentsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->branch = Branch::create(['name' => 'San Felipe del Progreso']);
    }

    /** Payload mínimo de una nota de $500 con las partidas que exige el validador. */
    private function notePayload(array $overrides = []): array
    {
        return array_merge([
            'folio' => '1001',
            'customer' => 'Cliente',
            'date' => '2026-08-10',
            'purchase_total' => 300,
            'sale_total' => 500,
            'flete' => 0,
            'branch_id' => $this->branch->id,
            'delivery_status' => 'pendiente',
            'status' => 'pending',
            'purchase_status' => 'pending',
            'notes' => '',
            'items' => [[
                'brand' => 'Marca',
                'model' => 'Modelo',
                'measure' => '20x30',
                'mc' => '1',
                'unit' => 'PZA',
                'quantity' => 1,
                'cost' => 300,
                'price' => 500,
                'iva' => 0,
                'extra' => 0,
                'purchase_subtotal' => 300,
                'sale_subtotal' => 500,
                'supplied_status' => 'no_enviado',
                'delivery_status' => 'pendiente',
                'product_id' => null,
            ]],
            'payments' => [],
        ], $overrides);
    }

    private function actingAsUser(): self
    {
        $this->actingAs($this->user)->withSession(['branch_id' => $this->branch->id]);

        return $this;
    }

    public function test_una_nota_acepta_n_pagos_en_fechas_distintas(): void
    {
        $this->actingAsUser()->post(route('notes.store'), $this->notePayload([
            'payments' => [
                ['date' => '2026-08-10', 'cash' => 100, 'card' => 50, 'transfer' => 0],
                ['date' => '2026-08-12', 'cash' => 0, 'card' => 0, 'transfer' => 150],
                ['date' => '2026-08-20', 'cash' => 75, 'card' => 0, 'transfer' => 0],
            ],
        ]))->assertRedirect();

        $note = Note::with('payments')->firstOrFail();

        $this->assertCount(3, $note->payments);
        $this->assertSame([0, 1, 2], $note->payments->pluck('position')->all());
        $this->assertEquals(
            ['2026-08-10', '2026-08-12', '2026-08-20'],
            $note->payments->map(fn ($p) => $p->date->format('Y-m-d'))->all()
        );
    }

    public function test_el_servidor_calcula_advance_y_balance_desde_los_pagos(): void
    {
        // El cliente manda cifras equivocadas a propósito: no deben usarse.
        $this->actingAsUser()->post(route('notes.store'), $this->notePayload([
            'advance' => 9999,
            'balance' => -9999,
            'payments' => [
                ['date' => '2026-08-10', 'cash' => 100, 'card' => 50, 'transfer' => 0],
                ['date' => '2026-08-12', 'cash' => 0, 'card' => 0, 'transfer' => 150],
            ],
        ]))->assertRedirect();

        $note = Note::firstOrFail();

        $this->assertEquals(300, $note->advance);
        $this->assertEquals(200, $note->balance);
        // Los agregados por método suman TODOS los pagos.
        $this->assertEquals(100, $note->cash);
        $this->assertEquals(50, $note->card);
        $this->assertEquals(150, $note->transfer);
    }

    public function test_los_pagos_en_cero_no_se_guardan(): void
    {
        $this->actingAsUser()->post(route('notes.store'), $this->notePayload([
            'payments' => [
                ['date' => '2026-08-10', 'cash' => 100, 'card' => 0, 'transfer' => 0],
                ['date' => '2026-08-11', 'cash' => 0, 'card' => 0, 'transfer' => 0],
            ],
        ]))->assertRedirect();

        $this->assertCount(1, Note::firstOrFail()->payments);
    }

    public function test_actualizar_la_nota_reemplaza_por_completo_sus_pagos(): void
    {
        $this->actingAsUser()->post(route('notes.store'), $this->notePayload([
            'payments' => [['date' => '2026-08-10', 'cash' => 100, 'card' => 0, 'transfer' => 0]],
        ]));

        $note = Note::firstOrFail();

        $this->actingAsUser()->put(route('notes.update', $note->id), $this->notePayload([
            'payments' => [
                ['date' => '2026-08-10', 'cash' => 100, 'card' => 0, 'transfer' => 0],
                ['date' => '2026-08-15', 'cash' => 400, 'card' => 0, 'transfer' => 0],
            ],
        ]))->assertRedirect();

        $note->refresh()->load('payments');

        $this->assertCount(2, $note->payments);
        $this->assertEquals(500, $note->advance);
        $this->assertEquals(0, $note->balance);
    }

    public function test_una_nota_cancelada_no_conserva_pagos(): void
    {
        $this->actingAsUser()->post(route('notes.store'), $this->notePayload([
            'delivery_status' => 'cancelado',
            'payments' => [['date' => '2026-08-10', 'cash' => 100, 'card' => 0, 'transfer' => 0]],
        ]))->assertRedirect();

        $note = Note::firstOrFail();

        $this->assertCount(0, $note->payments);
        $this->assertEquals(0, $note->advance);
        $this->assertSame('canceled', $note->status);
    }
}
