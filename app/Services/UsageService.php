<?php

namespace App\Services;

use App\Models\Note;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Uso del sistema para el super admin: ¿se está usando la caja? Compara las ventas de
 * mostrador (notes.source = caja) con las notas capturadas a mano, por día, por usuario y
 * por sucursal, y cuenta qué funciones se usan (crédito, flete, precio cambiado, tickets…).
 *
 * Las notas del periodo se traen con pocas columnas y se agregan en PHP: así la hora del
 * día (zona del negocio) y las reglas de cancelación no dependen del motor de base de datos.
 */
class UsageService
{
    private CarbonImmutable $from;

    private CarbonImmutable $to;

    public function __construct(private int $days, private ?int $branchId = null)
    {
        $this->to = CarbonImmutable::parse(businessToday());
        $this->from = $this->to->subDays($days - 1);
    }

    public function build(): array
    {
        $notes = $this->notes($this->from, $this->to);
        $previous = $this->notes($this->from->subDays($this->days), $this->from->subDay());

        $valid = $notes->reject->canceled;
        $caja = $valid->where('source', Note::SOURCE_CAJA);
        $manual = $valid->where('source', '!=', Note::SOURCE_CAJA);
        $prevCaja = $previous->reject->canceled->where('source', Note::SOURCE_CAJA);

        $credit = $this->creditNoteIds($caja);

        return [
            'period' => ['days' => $this->days, 'from' => $this->from->toDateString(), 'to' => $this->to->toDateString()],
            'kpis' => [
                'caja_count' => $caja->count(),
                'caja_count_prev' => $prevCaja->count(),
                'caja_amount' => round($caja->sum('sale_total'), 2),
                'caja_amount_prev' => round($prevCaja->sum('sale_total'), 2),
                'manual_count' => $manual->count(),
                'manual_amount' => round($manual->sum('sale_total'), 2),
                'adoption' => $valid->count() > 0 ? round($caja->count() / $valid->count() * 100, 1) : null,
                'adoption_amount' => $valid->sum('sale_total') > 0 ? round($caja->sum('sale_total') / $valid->sum('sale_total') * 100, 1) : null,
                'avg_ticket' => $caja->count() > 0 ? round($caja->sum('sale_total') / $caja->count(), 2) : 0,
                'sellers' => $caja->pluck('user_id')->filter()->unique()->count(),
                'days_with_caja' => $caja->pluck('date')->unique()->count(),
            ],
            'daily' => $this->daily($valid),
            'hours' => $this->hours($caja),
            'users' => $this->users($notes),
            'activityTracked' => $this->tracksActivity(),
            'branches' => $this->branches($notes),
            'functions' => [
                'credit' => $credit->count(),
                'flete' => $caja->where('flete', '>', 0.009)->count(),
                'price_changed' => $this->priceChangedNotes($caja->pluck('id')),
                'canceled' => $notes->where('source', Note::SOURCE_CAJA)->where('canceled', true)->count(),
                'tickets' => $this->tickets(false),
                'reprints' => $this->tickets(true),
                'collections' => $this->collections(),
                'entries' => $this->scoped(DB::table('stock_entries'))->whereBetween('date', $this->range())->count(),
                'cortes' => $this->scoped(DB::table('cortes'))->whereBetween('date', $this->range())->count(),
            ],
        ];
    }

    // ---------------------------------------------------------------- datos

    private function notes(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        return $this->scoped(DB::table('notes'))
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->get(['id', 'branch_id', 'user_id', 'source', 'date', 'sale_total', 'flete', 'status', 'delivery_status', 'created_at'])
            ->map(fn ($n) => (object) [
                'id' => $n->id,
                'branch_id' => (int) $n->branch_id,
                'user_id' => $n->user_id ? (int) $n->user_id : null,
                'source' => $n->source ?? Note::SOURCE_NOTA,
                'date' => substr((string) $n->date, 0, 10),
                'sale_total' => (float) $n->sale_total,
                'flete' => (float) $n->flete,
                'canceled' => $n->status === 'canceled' || $n->delivery_status === 'cancelado',
                'created_at' => $n->created_at,
            ]);
    }

    private function scoped($query, string $column = 'branch_id')
    {
        return $query->when($this->branchId, fn ($q) => $q->where($column, $this->branchId));
    }

    private function range(): array
    {
        return [$this->from->toDateString(), $this->to->toDateString()];
    }

    /** created_at se guarda en UTC; el rango del periodo es en días del negocio. */
    private function utcRange(): array
    {
        $tz = config('app.business_timezone');

        return [
            CarbonImmutable::parse($this->from->toDateString(), $tz)->startOfDay()->setTimezone(config('app.timezone')),
            CarbonImmutable::parse($this->to->toDateString(), $tz)->endOfDay()->setTimezone(config('app.timezone')),
        ];
    }

    // ------------------------------------------------------------- secciones

    private function daily(Collection $valid): array
    {
        $byDate = $valid->groupBy('date');
        $rows = [];
        for ($d = $this->from; $d->lte($this->to); $d = $d->addDay()) {
            $day = $byDate->get($d->toDateString(), collect());
            $rows[] = [
                'key' => $d->toDateString(),
                'caja' => $day->where('source', Note::SOURCE_CAJA)->count(),
                'nota' => $day->where('source', '!=', Note::SOURCE_CAJA)->count(),
            ];
        }

        return $rows;
    }

    /** Ventas de caja por hora del día (zona del negocio). */
    private function hours(Collection $caja): array
    {
        $tz = config('app.business_timezone');
        $counts = array_fill(0, 24, 0);
        foreach ($caja as $n) {
            if ($n->created_at) {
                $counts[CarbonImmutable::parse($n->created_at, config('app.timezone'))->setTimezone($tz)->hour]++;
            }
        }
        $used = array_keys(array_filter($counts));
        if (! $used) {
            return [];
        }

        // Por lo menos el horario normal de la tienda (8 a 20 h), para que una sola venta no llene la gráfica.
        return collect(range(min(8, min($used)), max(20, max($used))))->map(fn ($h) => ['hour' => $h, 'count' => $counts[$h]])->all();
    }

    private function users(Collection $notes): array
    {
        $byUser = $notes->groupBy('user_id');
        $lastSale = DB::table('notes')->where('source', Note::SOURCE_CAJA)->whereNotNull('user_id')
            ->groupBy('user_id')->selectRaw('user_id, MAX(created_at) as last')->pluck('last', 'user_id');
        $lastActivity = $this->tracksActivity()
            ? DB::table('sessions')->whereNotNull('user_id')->groupBy('user_id')->selectRaw('user_id, MAX(last_activity) as last')->pluck('last', 'user_id')
            : collect();
        $tickets = $this->scopedTickets()->groupBy('ticket_prints.user_id')
            ->selectRaw('ticket_prints.user_id as user_id, COUNT(*) as total')->pluck('total', 'user_id');

        return User::query()
            // El super admin sólo aparece si vendió o capturó algo en el periodo.
            ->where(fn ($q) => $q->where('role', '!=', User::SUPER_ADMIN)->orWhereIn('id', $notes->pluck('user_id')->filter()->unique()))
            ->when($this->branchId, fn ($q) => $q->where(fn ($q) => $q->where('role', User::OWNER)->orWhereHas('branches', fn ($b) => $b->where('branches.id', $this->branchId))))
            ->with('branches:id,name')
            ->orderBy('name')
            ->get()
            ->map(function (User $u) use ($byUser, $lastSale, $lastActivity, $tickets) {
                $mine = $byUser->get($u->id, collect());
                $caja = $mine->where('source', Note::SOURCE_CAJA);

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'role' => $u->role,
                    'active' => (bool) $u->active,
                    'branches' => $u->role === User::CASHIER ? $u->branches->pluck('name')->all() : [],
                    'caja_count' => $caja->reject->canceled->count(),
                    'caja_amount' => round($caja->reject->canceled->sum('sale_total'), 2),
                    'canceled' => $caja->where('canceled', true)->count(),
                    'manual_count' => $mine->where('source', '!=', Note::SOURCE_CAJA)->reject->canceled->count(),
                    'tickets' => (int) ($tickets[$u->id] ?? 0),
                    'last_sale' => isset($lastSale[$u->id]) ? CarbonImmutable::parse($lastSale[$u->id], config('app.timezone'))->toIso8601String() : null,
                    'last_activity' => isset($lastActivity[$u->id]) ? CarbonImmutable::createFromTimestamp((int) $lastActivity[$u->id])->toIso8601String() : null,
                ];
            })
            ->sortByDesc('caja_count')
            ->values()
            ->all();
    }

    /** La última actividad sale de la tabla de sesiones (SESSION_DRIVER=database). */
    public function tracksActivity(): bool
    {
        return config('session.driver') === 'database' && Schema::hasTable(config('session.table', 'sessions'));
    }

    private function branches(Collection $notes): array
    {
        $cortes = $this->scoped(DB::table('cortes'))->whereBetween('date', $this->range())
            ->groupBy('branch_id')->selectRaw('branch_id, COUNT(*) as total')->pluck('total', 'branch_id');
        $byBranch = $notes->reject->canceled->groupBy('branch_id');

        return DB::table('branches')->when($this->branchId, fn ($q) => $q->where('id', $this->branchId))
            ->orderBy('id')->get(['id', 'name'])
            ->map(function ($b) use ($byBranch, $cortes) {
                $mine = $byBranch->get((int) $b->id, collect());
                $caja = $mine->where('source', Note::SOURCE_CAJA);

                return [
                    'id' => (int) $b->id,
                    'name' => $b->name,
                    'caja_count' => $caja->count(),
                    'caja_amount' => round($caja->sum('sale_total'), 2),
                    'manual_count' => $mine->count() - $caja->count(),
                    'adoption' => $mine->count() > 0 ? round($caja->count() / $mine->count() * 100, 1) : null,
                    'days_with_sales' => $mine->pluck('date')->unique()->count(),
                    'cortes' => (int) ($cortes[$b->id] ?? 0),
                ];
            })
            ->all();
    }

    /**
     * A crédito: lo pagado AL VENDER no cubrió el total (aunque después la liquidaran, ese
     * mismo día u otro). Pagos "al vender" = guardados junto con la nota (mismo request).
     */
    private function creditNoteIds(Collection $caja): Collection
    {
        if ($caja->isEmpty()) {
            return collect();
        }
        $created = $caja->pluck('created_at', 'id');
        // El de la venta es el primer pago (position 0) y se guardó junto con la nota; un cobro
        // posterior es otra fila, o la 0 pero guardada después (crédito sin anticipo).
        $paidAtSale = DB::table('note_payments')->whereIn('note_id', $caja->pluck('id'))->where('position', 0)
            ->get(['note_id', 'cash', 'card', 'transfer', 'created_at'])
            ->filter(fn ($p) => $p->created_at && $created[$p->note_id]
                && CarbonImmutable::parse($p->created_at)->lte(CarbonImmutable::parse($created[$p->note_id])->addMinute()))
            ->groupBy('note_id')
            ->map(fn ($rows) => $rows->sum(fn ($p) => (float) $p->cash + (float) $p->card + (float) $p->transfer));

        return $caja->filter(fn ($n) => (float) ($paidAtSale[$n->id] ?? 0) < $n->sale_total - 0.009)->pluck('id');
    }

    private function priceChangedNotes(Collection $ids): int
    {
        if ($ids->isEmpty()) {
            return 0;
        }

        return DB::table('note_product')->whereIn('note_id', $ids)->whereNotNull('list_price')
            ->whereRaw('ABS(price - list_price) >= 0.005')->distinct()->count('note_id');
    }

    private function scopedTickets()
    {
        return DB::table('ticket_prints')
            ->join('notes', 'notes.id', '=', 'ticket_prints.note_id')
            ->whereBetween('ticket_prints.created_at', $this->utcRange())
            ->when($this->branchId, fn ($q) => $q->where('notes.branch_id', $this->branchId));
    }

    private function tickets(bool $reprints): int
    {
        return $this->scopedTickets()->where('ticket_prints.reprint', $reprints)->count();
    }

    /** Abonos: pagos hechos en el periodo en un día posterior al de su nota. */
    private function collections(): int
    {
        return $this->scoped(DB::table('note_payments')->join('notes', 'notes.id', '=', 'note_payments.note_id'), 'note_payments.branch_id')
            ->whereBetween('note_payments.date', $this->range())
            ->whereColumn('note_payments.date', '>', 'notes.date')
            ->count();
    }
}
