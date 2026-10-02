<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Analíticas del dashboard de administración.
 *
 * Todas las consultas reciben el rango [from, to] y una sucursal opcional
 * (null = todas). A diferencia del resto de la app NO usan currentBranchId():
 * el dashboard compara sucursales a propósito.
 *
 * Una nota cancelada (status = canceled o delivery_status = cancelado) se
 * excluye en todo, igual que cleanNotes() en Cortes/Form.tsx.
 *
 * Sólo query builder + SUM/COUNT/GROUP BY: corre igual en pgsql, mysql y sqlite.
 */
class AnalyticsService
{
    public const LOW_STOCK_THRESHOLD = 3;

    public function __construct(
        private CarbonImmutable $from,
        private CarbonImmutable $to,
        private ?int $branchId = null,
        private ?CarbonImmutable $today = null,
    ) {
        $this->today ??= CarbonImmutable::now(config('billing.timezone'))->startOfDay();
    }

    public function granularity(): string
    {
        return $this->from->diffInDays($this->to) <= 92 ? 'day' : 'month';
    }

    // ---------------------------------------------------------------- Ventas

    /** KPIs del periodo, con el periodo anterior de igual duración para comparar. */
    public function salesSummary(): array
    {
        $days = (int) $this->from->diffInDays($this->to) + 1;
        $prevTo = $this->from->subDay();
        $prevFrom = $prevTo->subDays($days - 1);

        return [
            'current' => $this->salesTotals($this->from, $this->to),
            'previous' => $this->salesTotals($prevFrom, $prevTo),
            'previous_range' => [$prevFrom->toDateString(), $prevTo->toDateString()],
        ];
    }

    private function salesTotals(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $row = $this->notes($from, $to)
            ->selectRaw('COUNT(*) as notes_count, COALESCE(SUM(sale_total), 0) as sale, COALESCE(SUM(purchase_total), 0) as purchase')
            ->first();

        $sale = (float) $row->sale;
        $purchase = (float) $row->purchase;
        $count = (int) $row->notes_count;

        return [
            'sale' => round($sale, 2),
            'purchase' => round($purchase, 2),
            'profit' => round($sale - $purchase, 2),
            'margin' => $sale > 0 ? round(($sale - $purchase) / $sale * 100, 1) : null,
            'notes_count' => $count,
            'avg_ticket' => $count > 0 ? round($sale / $count, 2) : null,
        ];
    }

    /** Venta, costo y utilidad por día o por mes (según el largo del rango). */
    public function salesSeries(): array
    {
        $rows = $this->notes($this->from, $this->to)
            ->select('date')
            ->selectRaw('COUNT(*) as notes_count, SUM(sale_total) as sale, SUM(purchase_total) as purchase')
            ->groupBy('date')
            ->get();

        return $this->fillBuckets($rows, fn (Collection $group) => [
            'sale' => round((float) $group->sum('sale'), 2),
            'purchase' => round((float) $group->sum('purchase'), 2),
            'profit' => round((float) $group->sum('sale') - (float) $group->sum('purchase'), 2),
            'notes_count' => (int) $group->sum('notes_count'),
        ]);
    }

    /** Totales del periodo por sucursal (siempre todas, ignora el filtro). */
    public function salesByBranch(): array
    {
        $rows = $this->notes($this->from, $this->to, allBranches: true)
            ->select('branch_id')
            ->selectRaw('COUNT(*) as notes_count, SUM(sale_total) as sale, SUM(purchase_total) as purchase')
            ->groupBy('branch_id')
            ->get()
            ->keyBy('branch_id');

        return DB::table('branches')->orderBy('id')->get(['id', 'name'])
            ->map(function ($branch) use ($rows) {
                $row = $rows->get($branch->id);
                $sale = (float) ($row->sale ?? 0);
                $purchase = (float) ($row->purchase ?? 0);

                return [
                    'branch_id' => $branch->id,
                    'name' => $branch->name,
                    'sale' => round($sale, 2),
                    'profit' => round($sale - $purchase, 2),
                    'margin' => $sale > 0 ? round(($sale - $purchase) / $sale * 100, 1) : null,
                    'notes_count' => (int) ($row->notes_count ?? 0),
                ];
            })->values()->all();
    }

    // -------------------------------------------------------------- Cobranza

    /** Dinero cobrado en el periodo según la fecha de cada pago (no la de la nota). */
    public function collections(): array
    {
        $rows = $this->payments()
            ->select('note_payments.date')
            ->selectRaw('SUM(note_payments.cash) as cash, SUM(note_payments.card) as card, SUM(note_payments.transfer) as transfer')
            ->groupBy('note_payments.date')
            ->get();

        $totals = [
            'cash' => round((float) $rows->sum('cash'), 2),
            'card' => round((float) $rows->sum('card'), 2),
            'transfer' => round((float) $rows->sum('transfer'), 2),
        ];
        $totals['total'] = round(array_sum($totals), 2);

        return [
            'totals' => $totals,
            'series' => $this->fillBuckets($rows, fn (Collection $group) => [
                'cash' => round((float) $group->sum('cash'), 2),
                'card' => round((float) $group->sum('card'), 2),
                'transfer' => round((float) $group->sum('transfer'), 2),
            ]),
        ];
    }

    /**
     * Cuentas por cobrar a hoy: notas no canceladas con saldo pendiente,
     * sin importar el rango (una deuda de hace 3 meses sigue siendo deuda).
     */
    public function receivables(int $limit = 15): array
    {
        // Con saldo, o marcadas "Pendiente" aunque ya no deban (falta marcarlas como pagadas).
        $notes = $this->baseNotes(DB::table('notes'))
            ->where(fn ($q) => $q->where('notes.balance', '>', 0.009)->orWhere('notes.status', 'pending'))
            ->join('branches', 'branches.id', '=', 'notes.branch_id')
            ->orderBy('notes.date')
            ->orderBy('notes.id')
            ->get(['notes.id', 'notes.folio', 'notes.date', 'notes.sale_total', 'notes.balance', 'notes.status', 'notes.customer', 'notes.customer_phone', 'branches.name as branch']);

        $buckets = ['0-30' => 0.0, '31-60' => 0.0, '61-90' => 0.0, '90+' => 0.0];
        $counts = array_fill_keys(array_keys($buckets), 0);

        $notes = $notes->map(function ($note) use (&$buckets, &$counts) {
            $age = (int) CarbonImmutable::parse($note->date)->diffInDays($this->today, false);
            $age = max($age, 0);
            $bucket = $age <= 30 ? '0-30' : ($age <= 60 ? '31-60' : ($age <= 90 ? '61-90' : '90+'));
            if ((float) $note->balance > 0.009) {
                $buckets[$bucket] += (float) $note->balance;
                $counts[$bucket]++;
            }
            $note->age_days = $age;
            $note->balance = round((float) $note->balance, 2);
            $note->sale_total = round((float) $note->sale_total, 2);

            return $note;
        });

        return [
            'total' => round($notes->sum('balance'), 2),
            'notes_count' => $notes->where('balance', '>', 0.009)->count(),
            'pending_count' => $notes->count(),
            'aging' => collect($buckets)->map(fn ($amount, $label) => [
                'label' => $label,
                'amount' => round($amount, 2),
                'notes_count' => $counts[$label],
            ])->values()->all(),
            'oldest' => $notes->sortByDesc('age_days')->take($limit)->values()->all(),
        ];
    }

    // ------------------------------------------------------------- Productos

    /**
     * Partidas vendidas en el periodo, agrupadas por la descripción guardada
     * en la partida (marca/modelo/medida): las partidas no siempre traen product_id.
     */
    public function topProducts(int $limit = 10): array
    {
        $rows = $this->baseNotes(DB::table('note_product')->join('notes', 'notes.id', '=', 'note_product.note_id'))
            ->whereBetween('notes.date', [$this->from->toDateString(), $this->to->toDateString()])
            ->select('note_product.brand', 'note_product.model', 'note_product.measure')
            ->selectRaw('SUM(note_product.quantity) as units, SUM(note_product.sale_subtotal) as sale, SUM(note_product.purchase_subtotal) as purchase, COUNT(DISTINCT note_product.note_id) as notes_count')
            ->groupBy('note_product.brand', 'note_product.model', 'note_product.measure')
            ->get()
            ->map(fn ($row) => [
                'brand' => $row->brand,
                'model' => $row->model,
                'measure' => $row->measure,
                'units' => (float) $row->units,
                'sale' => round((float) $row->sale, 2),
                'profit' => round((float) $row->sale - (float) $row->purchase, 2),
                'notes_count' => (int) $row->notes_count,
            ]);

        return [
            'by_sale' => $rows->sortByDesc('sale')->take($limit)->values()->all(),
            'by_units' => $rows->sortByDesc('units')->take($limit)->values()->all(),
            'by_profit' => $rows->sortByDesc('profit')->take($limit)->values()->all(),
        ];
    }

    // ------------------------------------------------------------ Inventario

    /** Foto actual del inventario (no depende del rango) + entradas del periodo. */
    public function inventory(int $limit = 15): array
    {
        // Sólo existencias contadas (counted_at): un producto que nunca se ha contado
        // "no tiene inventario cargado" y no es lo mismo que "sin existencia".
        $stockByProduct = DB::table('stocks')
            ->when($this->branchId, fn ($q) => $q->where('branch_id', $this->branchId))
            ->whereNotNull('counted_at')
            ->select('product_id')
            ->selectRaw('SUM(quantity) as quantity')
            ->groupBy('product_id')
            ->pluck('quantity', 'product_id');

        $products = DB::table('products')->get(['id', 'brand', 'model', 'measure', 'cost']);

        $tracked = $products->filter(fn ($p) => isset($stockByProduct[$p->id]));

        $withStock = $tracked->map(fn ($p) => (object) [
            'id' => $p->id,
            'brand' => $p->brand,
            'model' => $p->model,
            'measure' => $p->measure,
            'cost' => (float) $p->cost,
            'quantity' => (float) ($stockByProduct[$p->id] ?? 0),
        ]);

        $inStock = $withStock->where('quantity', '>', 0);
        $low = $inStock->where('quantity', '<=', self::LOW_STOCK_THRESHOLD);

        $entries = DB::table('stock_movements')
            ->join('products', 'products.id', '=', 'stock_movements.product_id')
            ->where('movement_type', 'IN')
            // Compras/cargas, no devoluciones de notas canceladas o eliminadas.
            ->whereNull('stock_movements.note_id')
            ->where(fn ($q) => $q->whereNull('stock_movements.description')->orWhere('stock_movements.description', 'not like', 'Devolución por%'))
            ->when($this->branchId, fn ($q) => $q->where('stock_movements.branch_id', $this->branchId))
            // created_at se guarda en la zona de la app (UTC); el rango es en hora local.
            ->whereBetween('stock_movements.created_at', [
                $this->from->startOfDay()->setTimezone(config('app.timezone')),
                $this->to->endOfDay()->setTimezone(config('app.timezone')),
            ])
            ->selectRaw('COUNT(*) as movements, COALESCE(SUM(stock_movements.quantity), 0) as units, COALESCE(SUM(stock_movements.quantity * products.cost), 0) as value')
            ->first();

        return [
            'value_at_cost' => round($inStock->sum(fn ($p) => $p->quantity * $p->cost), 2),
            'units' => round($inStock->sum('quantity'), 2),
            'products_total' => $products->count(),
            'products_in_stock' => $inStock->count(),
            'products_out_of_stock' => $withStock->count() - $inStock->count(),
            'products_untracked' => $products->count() - $tracked->count(),
            'products_low_stock' => $low->count(),
            'low_stock_threshold' => self::LOW_STOCK_THRESHOLD,
            'low_stock' => $low->sortBy('quantity')->take($limit)->values()->all(),
            'entries' => [
                'movements' => (int) $entries->movements,
                'units' => round((float) $entries->units, 2),
                'value_at_cost' => round((float) $entries->value, 2),
            ],
        ];
    }

    // --------------------------------------------------------------- helpers

    private function baseNotes(Builder $query, bool $allBranches = false): Builder
    {
        return $query
            ->where('notes.status', '!=', 'canceled')
            ->where(fn ($q) => $q->whereNull('notes.delivery_status')->orWhere('notes.delivery_status', '!=', 'cancelado'))
            ->when($this->branchId && ! $allBranches, fn ($q) => $q->where('notes.branch_id', $this->branchId));
    }

    private function notes(CarbonImmutable $from, CarbonImmutable $to, bool $allBranches = false): Builder
    {
        return $this->baseNotes(DB::table('notes'), $allBranches)
            ->whereBetween('notes.date', [$from->toDateString(), $to->toDateString()]);
    }

    private function payments(): Builder
    {
        return $this->baseNotes(DB::table('note_payments')->join('notes', 'notes.id', '=', 'note_payments.note_id'))
            ->whereBetween('note_payments.date', [$this->from->toDateString(), $this->to->toDateString()]);
    }

    /**
     * Reparte filas agrupadas por fecha en buckets continuos (día o mes),
     * incluyendo los vacíos, para que la gráfica no se salte huecos.
     */
    private function fillBuckets(Collection $rows, callable $aggregate): array
    {
        $monthly = $this->granularity() === 'month';
        $keyOf = fn ($date) => substr((string) $date, 0, $monthly ? 7 : 10);
        $grouped = $rows->groupBy(fn ($row) => $keyOf($row->date));

        $buckets = [];
        $cursor = $monthly ? $this->from->startOfMonth() : $this->from;
        while ($cursor <= $this->to) {
            $key = $cursor->format($monthly ? 'Y-m' : 'Y-m-d');
            $buckets[] = ['key' => $key, ...$aggregate($grouped->get($key, collect()))];
            $cursor = $monthly ? $cursor->addMonth() : $cursor->addDay();
        }

        return $buckets;
    }
}
