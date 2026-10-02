<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Corte;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Lista de cortes: totales de todo el periodo, el corte de hoy y días repetidos. */
class CorteIndexTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
    }

    private function corte(string $date, float $sale, ?Branch $branch = null): Corte
    {
        return Corte::create(['date' => $date, 'sale_total' => $sale, 'notes_total' => $sale, 'cash_total' => $sale / 2, 'card_total' => $sale / 4,
            'transfer_total' => $sale / 4, 'previous_notes_total' => 0, 'expenses_total' => 10, 'expenses' => [], 'notes' => [], 'returns' => [],
            'previous_notes' => [], 'branch_id' => ($branch ?? $this->a)->id]);
    }

    public function test_period_totals_today_and_repeated_days(): void
    {
        $today = businessToday();
        $earlier = now(config('app.business_timezone'))->startOfMonth()->toDateString();
        $this->corte($earlier, 1000);
        $this->corte($earlier, 1000); // repetido
        $todays = $this->corte($today, 400);
        $this->corte('2020-01-01', 99999); // fuera del mes
        $this->corte($today, 5000, Branch::create(['name' => 'B'])); // otra sucursal

        $this->actingAs(User::factory()->create())->withSession(['branch_id' => $this->a->id])->get('/cortes')
            ->assertInertia(fn ($page) => $page
                ->where('totals.count', $earlier === $today ? 3 : 3)
                ->where('totals.sale', 2400)
                ->where('totals.cash', 1200)
                ->where('totals.expenses', 30)
                ->where('todayCorteId', $todays->id)
                ->where('repeatedDates', $earlier === $today ? [$today] : [$earlier]));

        $this->actingAs(User::factory()->create())->withSession(['branch_id' => $this->a->id])->get('/cortes?filter=ALL_TIME')
            ->assertInertia(fn ($page) => $page->where('totals.count', 4));
    }

    public function test_corte_pdf_summarizes_credit_sales(): void
    {
        $note = fn ($folio, $total, $advance, $status) => ['id' => $folio, 'folio' => $folio, 'date' => businessToday(), 'advance' => $advance, 'balance' => $total - $advance,
            'sale_total' => $total, 'cash' => $advance, 'card' => 0, 'transfer' => 0, 'purchase_total' => 0, 'status' => $status, 'delivery_status' => 'entregado_a_cliente'];
        $corte = $this->corte(businessToday(), 3500);
        $corte->update(['notes' => [$note('10', 1500, 1500, 'pending'), $note('11', 2000, 500, 'pending'), $note('12', 999, 0, 'canceled')]]);

        $html = view('pdf.corte', ['corte' => $corte->fresh()->load('branch'), 'branch_name' => 'A', 'hideCosts' => true])->render();

        $this->assertStringContainsString('Ventas a crédito: 1', $html);
        $this->assertStringContainsString('A cuenta $500.00', $html);
        $this->assertStringContainsString('Restan $1,500.00', $html);
        $this->assertStringContainsString('11 <strong>(CRÉDITO)</strong>', $html);
        $this->assertStringNotContainsString('10 <strong>(CRÉDITO)</strong>', $html);
    }
}
