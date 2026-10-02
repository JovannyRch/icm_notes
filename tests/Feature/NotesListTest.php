<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Lista de notas del dueño: totales del periodo, búsqueda por cliente, saldo, orden y resumen. */
class NotesListTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->owner = User::factory()->create();
    }

    private function note(string $folio, float $total, float $paid, array $extra = [], ?Branch $branch = null): Note
    {
        $branch ??= $this->a;
        $note = Note::create(array_merge(['folio' => $folio, 'date' => businessToday(), 'branch_id' => $branch->id, 'purchase_total' => $total / 2,
            'sale_total' => $total, 'status' => 'pending', 'purchase_status' => 'pending', 'delivery_status' => 'entregado_a_cliente', 'flete' => 0,
            'customer' => 'Juan'], $extra));
        if ($paid > 0) {
            $note->payments()->create(['branch_id' => $branch->id, 'date' => $note->date, 'cash' => $paid, 'card' => 0, 'transfer' => 0, 'position' => 0]);
        }
        $note->recalculateTotalsFromPayments();
        $note->items()->create(['brand' => 'CASTEL', 'model' => 'MARMOL', 'measure' => '60X60', 'mc' => '1.44', 'quantity' => 2, 'price' => $total / 2,
            'sale_subtotal' => $total, 'purchase_subtotal' => $total / 2, 'cost' => $total / 4, 'iva' => 16, 'extra' => 0]);

        return $note->fresh();
    }

    private function list(array $query = [])
    {
        return $this->actingAs($this->owner)->withSession(['branch_id' => $this->a->id])->get(route('notas', $query));
    }

    public function test_period_totals_skip_canceled_and_other_branches(): void
    {
        $this->note('1', 1000, 1000, ['status' => 'paid', 'purchase_status' => 'paid']);
        $this->note('2', 2000, 500);
        $this->note('3', 900, 0, ['status' => 'canceled']);
        $this->note('9', 5000, 0, [], $this->b);

        $this->list()->assertInertia(fn ($page) => $page
            ->where('totals.count', 3)
            ->where('totals.canceled', 1)
            ->where('totals.sale', 3000)
            ->where('totals.collected', 1500)
            ->where('totals.balance', 1500)
            ->where('totals.with_balance', 1)
            ->where('totals.purchase', 1500)
            ->where('totals.purchase_pending', 1000)
            ->where('today', businessToday())
            // El resumen viaja con la nota: partidas, pagos y vendedor.
            ->where('pagination.data.1.folio', '2')
            ->where('pagination.data.1.items.0.model', 'MARMOL')
            ->where('pagination.data.1.payments.0.cash', fn ($v) => (float) $v === 500.0)
            ->has('pagination.data.1.seller'));
    }

    public function test_search_by_customer_or_phone_and_only_with_balance(): void
    {
        $this->note('10', 1000, 1000, ['status' => 'paid', 'customer' => 'Constructora López', 'customer_phone' => '712 555 0101']);
        $this->note('11', 800, 300, ['customer' => 'María']);

        $this->list(['query' => 'lópez'])->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.folio', '10'));
        $this->list(['query' => '555 01'])->assertInertia(fn ($page) => $page->has('pagination.data', 1)->where('pagination.data.0.folio', '10'));
        $this->list(['query' => '11'])->assertInertia(fn ($page) => $page->where('pagination.data.0.folio', '11'));

        $this->list(['saldo' => 1])->assertInertia(fn ($page) => $page
            ->where('withBalance', true)->has('pagination.data', 1)->where('pagination.data.0.folio', '11')->where('totals.balance', 500));
    }

    public function test_sort_options(): void
    {
        $this->note('2', 500, 0);
        $this->note('10', 3000, 2900);
        $this->note('1', 900, 100);

        $folios = fn ($sort) => $this->list($sort ? ['sort' => $sort] : [])->viewData('page')['props']['pagination']['data'];
        $this->assertSame(['1', '2', '10'], array_column($folios(null), 'folio'));
        $this->assertSame(['10', '2', '1'], array_column($folios('folio_desc'), 'folio'));
        $this->assertSame(['10', '1', '2'], array_column($folios('venta_desc'), 'folio'));
        $this->assertSame(['1', '2', '10'], array_column($folios('saldo_desc'), 'folio')); // 800, 500, 100
    }

    public function test_date_periods_use_ranges(): void
    {
        $this->note('1', 100, 0);
        $this->note('2', 100, 0, ['date' => now(config('app.business_timezone'))->subYear()->toDateString()]);

        $this->list(['date' => 'THIS_MONTH'])->assertInertia(fn ($page) => $page->where('totals.count', 1));
        $this->list(['date' => 'LAST_YEAR'])->assertInertia(fn ($page) => $page->where('totals.count', 1)->where('pagination.data.0.folio', '2'));
        $this->list(['date' => 'ALL_TIME'])->assertInertia(fn ($page) => $page->where('totals.count', 2));
    }

    public function test_today_yesterday_and_custom_range(): void
    {
        $today = now(config('app.business_timezone'));
        $this->note('1', 100, 0, ['date' => $today->toDateString()]);
        $this->note('2', 100, 0, ['date' => $today->copy()->subDay()->toDateString()]);
        $this->note('3', 100, 0, ['date' => '2026-01-15']);

        $this->list(['date' => 'TODAY'])->assertInertia(fn ($page) => $page
            ->where('totals.count', 1)->where('pagination.data.0.folio', '1')
            ->where('dateRange', [$today->toDateString(), $today->toDateString()]));
        $this->list(['date' => 'YESTERDAY'])->assertInertia(fn ($page) => $page->where('totals.count', 1)->where('pagination.data.0.folio', '2'));

        // Rango propio: incluye ambos extremos; al revés se voltea; un solo extremo es un día.
        $this->list(['date' => 'CUSTOM', 'desde' => '2026-01-01', 'hasta' => '2026-01-31'])->assertInertia(fn ($page) => $page
            ->where('totals.count', 1)->where('pagination.data.0.folio', '3')->where('dateRange', ['2026-01-01', '2026-01-31']));
        $this->list(['date' => 'CUSTOM', 'desde' => '2026-01-31', 'hasta' => '2026-01-01'])->assertInertia(fn ($page) => $page
            ->where('dateRange', ['2026-01-01', '2026-01-31']));
        $this->list(['date' => 'CUSTOM', 'desde' => '2026-01-15'])->assertInertia(fn ($page) => $page
            ->where('totals.count', 1)->where('dateRange', ['2026-01-15', '2026-01-15']));
        // Fechas inválidas: sin filtro de fecha.
        $this->list(['date' => 'CUSTOM', 'desde' => 'mañana'])->assertInertia(fn ($page) => $page->where('totals.count', 3)->where('dateRange', null));
    }
}
