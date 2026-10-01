<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use App\Services\AnalyticsService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    protected function setUp(): void
    {
        parent::setUp();

        $this->a = Branch::create(['name' => 'Sucursal A']);
        $this->b = Branch::create(['name' => 'Sucursal B']);
    }

    private function note(array $attrs, array $items = [], array $payments = []): int
    {
        $id = DB::table('notes')->insertGetId(array_merge([
            'folio' => '1', 'date' => '2026-09-10',
            'purchase_total' => 0, 'sale_total' => 0, 'balance' => 0,
            'status' => 'pending', 'purchase_status' => 'pending', 'delivery_status' => 'pendiente',
            'branch_id' => $this->a->id, 'created_at' => now(), 'updated_at' => now(),
        ], $attrs));

        foreach ($items as $item) {
            DB::table('note_product')->insert(array_merge([
                'note_id' => $id, 'product_id' => null, 'brand' => 'MICHELIN', 'model' => 'P4', 'measure' => '205',
                'unit' => 'PZA', 'mc' => '', 'quantity' => 1, 'cost' => 0, 'price' => 0, 'iva' => 0, 'extra' => 0,
                'sale_subtotal' => 0, 'purchase_subtotal' => 0, 'delivery_status' => 'pendiente', 'supplied_status' => 'no_enviado',
            ], $item));
        }

        foreach ($payments as $payment) {
            DB::table('note_payments')->insert(array_merge([
                'note_id' => $id, 'branch_id' => $attrs['branch_id'] ?? $this->a->id, 'date' => '2026-09-10',
                'cash' => 0, 'card' => 0, 'transfer' => 0,
            ], $payment));
        }

        return $id;
    }

    private function analytics(?int $branch = null): AnalyticsService
    {
        return new AnalyticsService(
            CarbonImmutable::parse('2026-09-01'),
            CarbonImmutable::parse('2026-09-30'),
            $branch,
            CarbonImmutable::parse('2026-09-30'),
        );
    }

    private function seedSales(): void
    {
        // Septiembre, sucursal A: 1000 venta / 600 costo, y 500 / 400
        $this->note(['date' => '2026-09-05', 'sale_total' => 1000, 'purchase_total' => 600],
            [['quantity' => 2, 'sale_subtotal' => 1000, 'purchase_subtotal' => 600]],
            [['date' => '2026-09-05', 'cash' => 700, 'card' => 300]]);
        $this->note(['date' => '2026-09-20', 'sale_total' => 500, 'purchase_total' => 400, 'balance' => 500],
            [['brand' => 'PIRELLI', 'model' => 'P7', 'quantity' => 5, 'sale_subtotal' => 500, 'purchase_subtotal' => 400]]);
        // Sucursal B
        $this->note(['date' => '2026-09-10', 'sale_total' => 2000, 'purchase_total' => 1500, 'branch_id' => $this->b->id],
            [], [['date' => '2026-09-10', 'transfer' => 2000, 'branch_id' => $this->b->id]]);
        // Cancelada (ambas formas): no cuenta en nada
        $this->note(['date' => '2026-09-11', 'sale_total' => 9999, 'purchase_total' => 1, 'status' => 'canceled', 'balance' => 9999]);
        $this->note(['date' => '2026-09-12', 'sale_total' => 9999, 'purchase_total' => 1, 'delivery_status' => 'cancelado', 'balance' => 9999]);
        // Agosto (periodo anterior), con pago en septiembre: el pago cuenta en la cobranza de septiembre
        $this->note(['date' => '2026-08-15', 'sale_total' => 800, 'purchase_total' => 500, 'balance' => 300],
            [], [['date' => '2026-08-15', 'cash' => 200], ['date' => '2026-09-02', 'card' => 300]]);
        // Vieja con saldo: 90+ días
        $this->note(['date' => '2026-05-01', 'sale_total' => 1200, 'purchase_total' => 900, 'balance' => 1200]);
    }

    public function test_sales_summary_excludes_canceled_and_compares_previous_period(): void
    {
        $this->seedSales();

        $summary = $this->analytics()->salesSummary();
        $this->assertSame(3500.0, $summary['current']['sale']);
        $this->assertSame(2500.0, $summary['current']['purchase']);
        $this->assertSame(1000.0, $summary['current']['profit']);
        $this->assertSame(28.6, $summary['current']['margin']);
        $this->assertSame(3, $summary['current']['notes_count']);
        $this->assertSame(800.0, $summary['previous']['sale']);
        $this->assertSame(['2026-08-02', '2026-08-31'], $summary['previous_range']);

        $branchA = $this->analytics($this->a->id)->salesSummary()['current'];
        $this->assertSame(1500.0, $branchA['sale']);
        $this->assertSame(750.0, $branchA['avg_ticket']);
    }

    public function test_series_fills_empty_days_and_switches_to_months(): void
    {
        $this->seedSales();

        $series = $this->analytics()->salesSeries();
        $this->assertCount(30, $series);
        $this->assertSame(['key' => '2026-09-05', 'sale' => 1000.0, 'purchase' => 600.0, 'profit' => 400.0, 'notes_count' => 1], $series[4]);
        $this->assertSame(0.0, $series[0]['sale']);

        $year = new AnalyticsService(CarbonImmutable::parse('2026-01-01'), CarbonImmutable::parse('2026-12-31'));
        $months = $year->salesSeries();
        $this->assertSame('month', $year->granularity());
        $this->assertCount(12, $months);
        $this->assertSame(3500.0, $months[8]['sale']);
    }

    public function test_sales_by_branch_ignores_branch_filter(): void
    {
        $this->seedSales();

        $byBranch = collect($this->analytics($this->a->id)->salesByBranch())->keyBy('name');
        $this->assertSame(1500.0, $byBranch['Sucursal A']['sale']);
        $this->assertSame(2000.0, $byBranch['Sucursal B']['sale']);
        $this->assertSame(25.0, $byBranch['Sucursal B']['margin']);
    }

    public function test_collections_use_payment_date(): void
    {
        $this->seedSales();

        $totals = $this->analytics()->collections()['totals'];
        $this->assertSame(['cash' => 700.0, 'card' => 600.0, 'transfer' => 2000.0, 'total' => 3300.0], $totals);
    }

    public function test_receivables_age_buckets(): void
    {
        $this->seedSales();

        $r = $this->analytics()->receivables();
        $this->assertSame(2000.0, $r['total']);
        $this->assertSame(3, $r['notes_count']);
        $aging = collect($r['aging'])->keyBy('label');
        $this->assertSame(500.0, $aging['0-30']['amount']);
        $this->assertSame(300.0, $aging['31-60']['amount']);
        $this->assertSame(1200.0, $aging['90+']['amount']);
        $this->assertSame(152, $r['oldest'][0]->age_days);
    }

    public function test_top_products(): void
    {
        $this->seedSales();

        $products = $this->analytics()->topProducts();
        $this->assertSame('MICHELIN', $products['by_sale'][0]['brand']);
        $this->assertSame('PIRELLI', $products['by_units'][0]['brand']);
        $this->assertSame(5.0, $products['by_units'][0]['units']);
    }

    public function test_inventory_snapshot(): void
    {
        $make = fn ($cost) => Product::create(['brand' => 'X', 'model' => 'M'.$cost, 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'iva' => 0, 'extra' => 0, 'price' => $cost * 2, 'cost' => $cost]);
        $p1 = $make(100);
        $p2 = $make(50);
        $make(10); // sin registro en stocks: cuenta como sin existencia
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $p1->id, 'quantity' => 10]);
        Stock::create(['branch_id' => $this->b->id, 'product_id' => $p1->id, 'quantity' => 5]);
        Stock::create(['branch_id' => $this->a->id, 'product_id' => $p2->id, 'quantity' => 2]);

        $all = $this->analytics()->inventory();
        $this->assertSame(1600.0, $all['value_at_cost']);
        $this->assertSame(2, $all['products_in_stock']);
        $this->assertSame(1, $all['products_out_of_stock']);
        $this->assertSame(1, $all['products_low_stock']);

        $b = $this->analytics($this->b->id)->inventory();
        $this->assertSame(500.0, $b['value_at_cost']);
        $this->assertSame(2, $b['products_out_of_stock']);
    }

    public function test_any_user_sees_the_dashboard_and_can_export(): void
    {
        $this->seedSales();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard', ['from' => '2026-09-01', 'to' => '2026-09-30', 'branch' => $this->a->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('sales.current.sale', 1500)
                ->where('filters.branch_name', 'Sucursal A'));

        $this->actingAs($user)
            ->get(route('dashboard.export', ['from' => '2026-09-01', 'to' => '2026-09-30']))
            ->assertOk()
            ->assertDownload('REPORTE_2026-09-01_2026-09-30.xlsx');
    }

    public function test_login_and_home_land_on_the_dashboard(): void
    {
        $user = User::factory()->create();

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('dashboard', absolute: false));

        $this->actingAs($user)->get('/')->assertRedirect(route('dashboard'));
    }

    public function test_default_range_is_last_30_days(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-01 10:00', 'America/Mexico_City'));

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('filters.from', '2026-09-02')
                ->where('filters.to', '2026-10-01'));
    }

    public function test_guests_are_sent_to_login(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }
}
