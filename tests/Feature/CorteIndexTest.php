<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Corte;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\View;
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

    public function test_corte_pdf_shows_dates_as_day_month_year(): void
    {
        $note = fn ($folio, $date) => ['id' => $folio, 'folio' => $folio, 'date' => $date, 'advance' => 0, 'balance' => 0,
            'sale_total' => 100, 'cash' => 100, 'card' => 0, 'transfer' => 0, 'purchase_total' => 0, 'status' => 'paid', 'delivery_status' => 'entregado_a_cliente'];
        $corte = $this->corte('2026-03-05', 100);
        $corte->update([
            'notes' => [$note('1', '2026-03-05')],
            'previous_notes' => [['folio' => '9', 'date' => '2026-02-28', 'cash' => '50', 'card' => '0', 'transfer' => '0']],
        ]);

        $html = view('pdf.corte', ['corte' => $corte->fresh()->load('branch'), 'branch_name' => 'A', 'hideCosts' => true])->render();

        $this->assertStringContainsString('Fecha: 05/03/2026', $html);
        $this->assertStringContainsString('>05/03/2026<', $html);
        $this->assertStringContainsString('>28/02/2026<', $html);
        // El <title> interno sigue en ISO (nombre de archivo/metadato, no lo lee el cliente).
        $this->assertStringNotContainsString('>2026-03-05<', $html);
        $this->assertStringNotContainsString('>2026-02-28<', $html);
    }

    /**
     * El cajero descarga el PDF sin "Total de compra a pisos Leo": sólo el dueño y el
     * super admin lo ven. Se cuelga de `costs.view` (config/permissions.php), que el
     * cajero nunca tiene aunque se la activen a mano (no es configurable por cajero).
     */
    public function test_only_owner_and_super_admin_see_the_purchase_total_in_the_downloaded_pdf(): void
    {
        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => User::CASHIER])->save();
        $cashier->branches()->sync([$this->a->id]);
        $owner = User::factory()->create();
        $owner->forceFill(['role' => User::OWNER])->save();
        $superAdmin = User::factory()->create();
        $superAdmin->forceFill(['role' => User::SUPER_ADMIN])->save();

        $corte = $this->corte(businessToday(), 1000);
        $corte->update(['notes' => [['id' => '1', 'folio' => '1', 'date' => businessToday(), 'advance' => 1000, 'balance' => 0,
            'sale_total' => 1000, 'cash' => 1000, 'card' => 0, 'transfer' => 0, 'purchase_total' => 777.77, 'status' => 'paid', 'delivery_status' => 'entregado_a_cliente']]]);

        $hideCosts = [];
        View::composer('pdf.corte', function ($view) use (&$hideCosts) {
            $hideCosts[] = $view->getData()['hideCosts'] ?? null;
        });

        $this->actingAs($cashier)->get(route('cortes.export', $corte))->assertOk();
        $this->actingAs($owner)->get(route('cortes.export', $corte))->assertOk();
        $this->actingAs($superAdmin)->get(route('cortes.export', $corte))->assertOk();

        // Orden: cajero, dueño, super admin.
        $this->assertSame([true, false, false], $hideCosts);
    }

    public function test_pdf_view_shows_the_purchase_total_only_without_hidecosts(): void
    {
        $corte = $this->corte(businessToday(), 1000);
        $corte->update(['notes' => [['id' => '1', 'folio' => '1', 'date' => businessToday(), 'advance' => 1000, 'balance' => 0,
            'sale_total' => 1000, 'cash' => 1000, 'card' => 0, 'transfer' => 0, 'purchase_total' => 777.77, 'status' => 'paid', 'delivery_status' => 'entregado_a_cliente']]]);

        $withCosts = view('pdf.corte', ['corte' => $corte->fresh()->load('branch'), 'branch_name' => 'A', 'hideCosts' => false])->render();
        $withoutCosts = view('pdf.corte', ['corte' => $corte->fresh()->load('branch'), 'branch_name' => 'A', 'hideCosts' => true])->render();

        $this->assertStringContainsString('Total de compra a pisos Leo: $777.77', $withCosts);
        $this->assertStringContainsString('TOTAL COMPRA', $withCosts);

        $this->assertStringNotContainsString('Total de compra a pisos Leo', $withoutCosts);
        $this->assertStringNotContainsString('TOTAL COMPRA', $withoutCosts);
        $this->assertStringNotContainsString('777.77', $withoutCosts);
    }

    public function test_corte_pdf_splits_card_into_credit_and_debit(): void
    {
        $note = fn ($folio, $card, $credit, $debit) => ['id' => $folio, 'folio' => $folio, 'date' => businessToday(), 'advance' => $card, 'balance' => 0,
            'sale_total' => $card, 'cash' => 0, 'card' => $card, 'card_credit' => $credit, 'card_debit' => $debit, 'transfer' => 0, 'purchase_total' => 0, 'status' => 'paid', 'delivery_status' => 'entregado_a_cliente'];
        $corte = $this->corte(businessToday(), 1000);
        $corte->update([
            'card_total' => 1000,
            'notes' => [$note('20', 600, 600, 0), $note('21', 300, 0, 300)],
            // Entrada de una nota anterior pagada con débito.
            'previous_notes' => [['folio' => '5', 'date' => '2026-01-01', 'cash' => '0', 'card' => '100', 'card_type' => 'debito', 'transfer' => '0']],
        ]);

        $html = view('pdf.corte', ['corte' => $corte->fresh()->load('branch'), 'branch_name' => 'A', 'hideCosts' => true])->render();

        $this->assertStringContainsString('(crédito $600.00 · débito $400.00)', $html);
        $this->assertStringContainsString('T. créd ($600.00)', $html);
        $this->assertStringContainsString('T. déb ($300.00)', $html);
    }
}
