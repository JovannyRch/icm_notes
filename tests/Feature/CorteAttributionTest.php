<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Services\CortePaymentsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El dinero de un corte son los pagos hechos ese día, no los pagos de las notas
 * emitidas ese día. Un abono tardío pertenece al corte del día en que se cobró.
 */
class CorteAttributionTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    private Branch $otherBranch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->branch = Branch::create(['name' => 'San Felipe del Progreso']);
        $this->otherBranch = Branch::create(['name' => 'Jilotepec']);
    }

    private function note(string $folio, string $date, array $payments, ?Branch $branch = null): Note
    {
        $branch ??= $this->branch;

        $note = Note::create([
            'folio' => $folio,
            'customer' => 'Cliente',
            'date' => $date,
            'purchase_total' => 300,
            'sale_total' => 500,
            'flete' => 0,
            'branch_id' => $branch->id,
            'delivery_status' => 'pendiente',
            'status' => 'pending',
            'purchase_status' => 'pending',
        ]);

        foreach (array_values($payments) as $position => $payment) {
            $note->payments()->create([
                'branch_id' => $branch->id,
                'date' => $payment['date'],
                'cash' => $payment['cash'] ?? 0,
                'card' => $payment['card'] ?? 0,
                'transfer' => $payment['transfer'] ?? 0,
                'position' => $position,
            ]);
        }

        $note->recalculateTotalsFromPayments();

        return $note;
    }

    public function test_el_abono_tardio_pertenece_al_corte_del_dia_en_que_se_cobro(): void
    {
        // Nota del 10 con un abono el 10 y otro el 15.
        $this->note('1001', '2026-08-10', [
            ['date' => '2026-08-10', 'cash' => 100],
            ['date' => '2026-08-15', 'cash' => 200],
        ]);

        // Nota emitida y cobrada el 15.
        $this->note('1002', '2026-08-15', [
            ['date' => '2026-08-15', 'cash' => 50],
        ]);

        $service = new CortePaymentsService;

        $day10 = $service->forBranchAndDate($this->branch->id, '2026-08-10');
        $this->assertEquals(['1001'], $day10['notes']->pluck('folio')->all());
        $this->assertSame([], $day10['previous_payments']);

        $day15 = $service->forBranchAndDate($this->branch->id, '2026-08-15');
        // La nota 1001 no es del día 15: su abono entra como "entrada anterior".
        $this->assertEquals(['1002'], $day15['notes']->pluck('folio')->all());
        $this->assertCount(1, $day15['previous_payments']);
        $this->assertSame('1001', $day15['previous_payments'][0]['folio']);
        $this->assertEquals(200, $day15['previous_payments'][0]['cash']);
        // La fecha que se muestra es la de la nota original, no la del pago.
        $this->assertSame('2026-08-10', $day15['previous_payments'][0]['date']);
    }

    public function test_las_entradas_anteriores_no_cruzan_sucursales(): void
    {
        $this->note('2001', '2026-08-10', [
            ['date' => '2026-08-15', 'cash' => 500],
        ], $this->otherBranch);

        $data = (new CortePaymentsService)->forBranchAndDate($this->branch->id, '2026-08-15');

        $this->assertCount(0, $data['notes']);
        $this->assertSame([], $data['previous_payments']);
    }

    public function test_el_endpoint_del_corte_devuelve_notas_y_entradas_anteriores(): void
    {
        $this->note('1001', '2026-08-10', [
            ['date' => '2026-08-15', 'transfer' => 300],
        ]);
        $this->note('1002', '2026-08-15', [
            ['date' => '2026-08-15', 'cash' => 50],
        ]);

        $response = $this->getJson("/api/notes/{$this->branch->id}/2026-08-15");

        $response->assertOk()
            ->assertJsonPath('notes.0.folio', '1002')
            ->assertJsonPath('previous_payments.0.folio', '1001')
            ->assertJsonPath('previous_payments.0.transfer', '300.00');

        // Cada nota viaja con sus pagos para que el corte pueda filtrar por fecha.
        $response->assertJsonPath('notes.0.payments.0.date', '2026-08-15');
    }

    public function test_una_nota_sin_pagos_ese_dia_aporta_cero_al_corte(): void
    {
        $this->note('1001', '2026-08-15', [
            ['date' => '2026-08-20', 'cash' => 500],
        ]);

        $data = (new CortePaymentsService)->forBranchAndDate($this->branch->id, '2026-08-15');

        $this->assertCount(1, $data['notes']);
        // La nota aparece en el corte del 15 (se emitió ese día) pero su dinero no:
        // el frontend suma sólo los pagos con fecha del corte.
        $payments = $data['notes'][0]->payments;
        $this->assertCount(1, $payments);
        $this->assertSame('2026-08-20', $payments[0]->date->format('Y-m-d'));
    }
}
