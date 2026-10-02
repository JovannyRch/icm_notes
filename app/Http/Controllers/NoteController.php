<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use App\Services\CortePaymentsService;
use App\Services\NoteStockService;
use App\Services\StockService;
use App\Support\CorteCosts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class NoteController extends Controller
{
    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $branch_id = currentBranchId();
        $branch = Branch::find($branch_id);
        $date = businessToday();

        return Inertia::render('Notes/Form', [
            'branch' => $branch,
            'date' => $date,
            // Folio sugerido (editable): el mayor de la sucursal + 1.
            'nextFolio' => $branch ? Note::nextFolio($branch->id) : '1',
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    private function validateRequest($request)
    {
        // La columna no admite nulos: un descuento vacío es 0.
        if ($request->has('discount')) {
            $request->merge(['discount' => (float) ($request->discount ?? 0)]);
        }

        return $request->validate([
            // Vacío: el servidor asigna el siguiente folio de la sucursal.
            'folio' => 'nullable|string|max:50',
            'discount' => 'nullable|numeric|min:0',
            'cash_received' => 'nullable|numeric|min:0',
            'customer_phone' => 'nullable|string|max:30',
            'customer_address' => 'nullable|string|max:255',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.list_price' => 'nullable|numeric|min:0',
            'date' => 'required',
            'purchase_total' => 'required',
            'sale_total' => 'required',
            'flete' => 'required',
            'branch_id' => 'required',
            'delivery_status' => 'required',
            'sale_total' => 'required',
            'status' => 'required',
            'purchase_status' => 'required',
            'items' => 'required',
            'items.*.price' => 'required|numeric',
            'items.*.cost' => 'required|numeric',
            'items.*.iva' => 'required|numeric',
            'items.*.extra' => 'required|numeric',
            'items.*.quantity' => 'required|integer',
            'payments' => 'array',
            'payments.*.date' => 'required|date',
            'payments.*.cash' => 'required|numeric|min:0',
            'payments.*.card' => 'required|numeric|min:0',
            'payments.*.transfer' => 'required|numeric|min:0',
            'payments.*.description' => 'nullable|string|max:255',
        ]);
    }

    /**
     * Reemplaza por completo los pagos de la nota (mismo patrón que las partidas).
     *
     * Una nota cancelada no conserva pagos: el frontend ya ponía los importes en
     * cero, aquí simplemente no se persiste ninguna fila.
     */
    private function syncPayments(Note $note, array $payments, bool $isCancelled = false): void
    {
        $note->payments()->delete();

        if ($isCancelled) {
            return;
        }

        $position = 0;

        foreach ($payments as $payment) {
            $cash = (float) ($payment['cash'] ?? 0);
            $card = (float) ($payment['card'] ?? 0);
            $transfer = (float) ($payment['transfer'] ?? 0);

            // Un pago sin importe no se guarda: la UI arranca con una fila vacía.
            if ($cash + $card + $transfer <= 0) {
                continue;
            }

            $note->payments()->create([
                'branch_id' => $note->branch_id,
                'date' => $payment['date'],
                'cash' => $cash,
                'card' => $card,
                'transfer' => $transfer,
                'position' => $position++,
                'description' => $payment['description'] ?? null,
            ]);
        }
    }

    /**
     * Crea las partidas. Con $moveStock registra la salida de inventario de cada una
     * (alta de nota); al editar se pasa false y el stock se ajusta por diferencia
     * en NoteStockService::sync(), para no volver a descontar lo ya descontado.
     */
    private function createItems($note, $items, bool $moveStock = true)
    {
        $stockService = new StockService;
        foreach ($items as $item) {
            NoteProduct::create([
                'note_id' => $note->id,
                'product_id' => isset($item['product_id']) ? $item['product_id'] : null,
                'brand' => $item['brand'],
                'model' => $item['model'],
                'measure' => $item['measure'],
                'quantity' => $item['quantity'],
                'mc' => $item['mc'],
                'unit' => $item['unit'],
                'cost' => $item['cost'],
                'price' => $item['price'],
                'iva' => $item['iva'],
                'extra' => $item['extra'],
                'purchase_subtotal' => $item['purchase_subtotal'],
                'sale_subtotal' => $item['sale_subtotal'],
                'discount' => $item['discount'] ?? 0,
                'list_price' => $item['list_price'] ?? null,
                'supplied_status' => $item['supplied_status'],
                'delivery_status' => $item['delivery_status'],
            ]);

            if ($moveStock && $item['product_id']) {
                // Sucursal de la nota, no la de la sesión: se puede editar una nota de otra sucursal.
                $stockService->adjustStock(
                    $note->branch_id,
                    $item['product_id'],
                    $item['quantity'],
                    'OUT',
                    $note->id,
                    'Salida por nota #'.$note->folio
                );
            }
        }
    }

    public function store(Request $request)
    {
        $this->validateRequest($request);
        abort_unless($request->user()->canAccessBranch((int) $request->branch_id), 403, 'No tienes acceso a esa sucursal.');

        if ($request->delivery_status == 'cancelado') {
            $request->merge(['status' => 'canceled']);
        }

        $items = $request->items;
        $payments = $request->input('payments', []);
        $isCancelled = $request->delivery_status == 'cancelado';

        $note = DB::transaction(function () use ($request, $items, $payments, $isCancelled) {
            if (blank($request->folio)) {
                // Bloquea la sucursal para que dos ventas simultáneas no tomen el mismo folio.
                Branch::whereKey($request->branch_id)->lockForUpdate()->first();
                $request->merge(['folio' => Note::nextFolio((int) $request->branch_id)]);
            }
            $note = new Note($request->all());
            $note->forceFill(['user_id' => $request->user()->id])->save();
            $this->createItems($note, $items, moveStock: ! NoteStockService::isCancelled($note));
            $this->syncPayments($note, $payments, $isCancelled);
            $note->recalculateTotalsFromPayments();

            return $note;
        });

        return redirect()->route('notes.show', $note->id)->with('success', 'Nota creada correctamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(Note $note)
    {
        $branch = $note->branch;
        $date = businessToday();

        $items = NoteProduct::where('note_id', $note->id)->get();

        return Inertia::render('Notes/Form', [
            'note' => $note,
            'seller' => $note->seller?->name,
            'branch' => $branch,
            'items' => $items,
            'payments' => $note->payments()->get(),
            'date' => $date,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Note $note)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Note $note)
    {
        $this->validateRequest($request);
        abort_unless($request->user()->canAccessBranch((int) $note->branch_id), 403, 'No tienes acceso a esa sucursal.');
        $items = $request->items;
        $payments = $request->input('payments', []);

        if ($request->delivery_status == 'cancelado') {
            $request->merge(['status' => 'canceled']);
        }

        $isCancelled = $request->delivery_status == 'cancelado';

        DB::transaction(function () use ($request, $note, $items, $payments, $isCancelled) {
            $noteStock = new NoteStockService;
            $wasCancelled = NoteStockService::isCancelled($note);
            $before = $noteStock->expectedQuantities($note);

            // Un folio vacío al editar conserva el actual.
            $note->update(blank($request->folio) ? $request->except('folio') : $request->all());

            NoteProduct::where('note_id', $note->id)->delete();
            $this->createItems($note, $items, moveStock: false);

            $isNowCancelled = NoteStockService::isCancelled($note);
            $reason = match (true) {
                ! $wasCancelled && $isNowCancelled => 'Devolución por cancelación de nota #'.$note->folio,
                $wasCancelled && ! $isNowCancelled => 'Salida por reactivación de nota #'.$note->folio,
                default => null,
            };
            $noteStock->sync($note, $before, $noteStock->expectedQuantities($note), $reason);
            $this->syncPayments($note, $payments, $isCancelled);
            $note->recalculateTotalsFromPayments();
        });

        return redirect()->route('notes.show', $note->id)->with('success', 'Nota actualizada');
    }

    /**
     * Cobro rápido de una nota pendiente (desde el dashboard): registra un pago con fecha
     * de HOY —así entra al corte del día como "entrada anterior"— y, si ya no debe nada,
     * la marca como pagada. Con saldo en cero sólo cambia el estatus.
     */
    public function collect(Request $request, Note $note)
    {
        abort_unless($request->user()->canAccessBranch((int) $note->branch_id), 403, 'No tienes acceso a esa sucursal.');
        $data = $request->validate([
            'method' => 'required|in:cash,card,transfer',
            'amount' => 'required|numeric|min:0',
        ], ['amount.required' => 'Escribe el importe que pagó el cliente.']);

        if (NoteStockService::isCancelled($note)) {
            return back()->with('error', "La nota {$note->folio} está cancelada.");
        }

        $balance = round((float) $note->balance, 2);
        $amount = round((float) $data['amount'], 2);
        if ($amount > $balance + 0.009) {
            return back()->withErrors(['amount' => 'El pago es mayor que el saldo ($'.number_format($balance, 2).').']);
        }
        if ($amount <= 0 && $balance > 0.009) {
            return back()->withErrors(['amount' => 'Escribe el importe que pagó el cliente.']);
        }

        DB::transaction(function () use ($note, $data, $amount) {
            if ($amount > 0) {
                $note->payments()->create([
                    'branch_id' => $note->branch_id,
                    'date' => businessToday(),
                    'cash' => $data['method'] === 'cash' ? $amount : 0,
                    'card' => $data['method'] === 'card' ? $amount : 0,
                    'transfer' => $data['method'] === 'transfer' ? $amount : 0,
                    'position' => (int) $note->payments()->max('position') + 1,
                    'description' => 'Cobro desde el dashboard',
                ]);
            }
            $note->recalculateTotalsFromPayments();
            if ((float) $note->balance <= 0.009) {
                $note->update(['status' => 'paid']);
            }
        });

        $note->refresh();

        return back()->with('success', $note->status === 'paid'
            ? "Nota {$note->folio} pagada."
            : 'Pago de $'.number_format($amount, 2)." registrado en la nota {$note->folio}. Resta $".number_format((float) $note->balance, 2).'.');
    }

    public function switchArchive(Note $note)
    {
        try {
            Note::where('id', $note->id)->update(['archived' => ! $note->archived]);
        } catch (\Throwable $th) {
            return redirect()->route('notes.show', $note->id)->with('error', 'Error al archivar la nota');
        }

        return redirect()->route('notes.show', $note->id)->with('success', 'Nota archivada');
    }

    public function archiveNotes(Request $request)
    {

        $ids = $request->ids;

        Note::whereIn('id', $ids)->update(['archived' => true]);
        $total = count($ids);

        if ($total == 1) {
            return redirect()->back()->with('success', 'Nota archivada');
        }

        return redirect()->back()->with('success', $total.' notas archivadas');
    }

    public function unarchiveNotes(Request $request)
    {

        $ids = $request->ids;
        Note::whereIn('id', $ids)->update(['archived' => false]);
        $total = count($ids);
        if ($total == 1) {
            return redirect()->back()->with('success', 'Nota desarchivada');
        }

        return redirect()->back()->with('success', $total.' notas desarchivadas');
    }

    public function deleteNotes(Request $request)
    {
        $ids = $request->ids;
        DB::transaction(function () use ($ids) {
            foreach (Note::whereIn('id', $ids)->get() as $note) {
                (new NoteStockService)->restore($note);
                $note->delete();
            }
        });
        $total = count($ids);

        return redirect()->back()->with('success', $total.' notas eliminados');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Note $note)
    {

        $branch_id = $note->branch_id;
        DB::transaction(function () use ($note) {
            (new NoteStockService)->restore($note);
            $note->delete();
        });

        return redirect()->route('notas', ['branch' => $branch_id])->with('success', 'Nota eliminada');
    }

    /** Órdenes de la lista (?sort=). Por omisión, por folio como siempre. */
    public const SORTS = ['folio', 'folio_desc', 'recientes', 'venta_desc', 'saldo_desc'];

    /**
     * Notas de la sucursal con los filtros de la lista, sin orden ni paginación (los totales
     * del periodo usan la misma consulta). Las fechas son las del negocio (México).
     */
    private function filteredNotes($branch_id, $archived, $query, $date, $status, $purchase_status, $delivery_status, bool $withBalance = false)
    {
        $like = DB::getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';

        return Note::where('branch_id', $branch_id)
            ->where('archived', $archived)
            // Folio, nombre o teléfono del cliente.
            ->when($query, fn ($q) => $q->where(fn ($w) => $w->where('folio', $like, '%'.$query.'%')
                ->orWhere('customer', $like, '%'.$query.'%')
                ->orWhere('customer_phone', $like, '%'.$query.'%')))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($purchase_status, fn ($q) => $q->where('purchase_status', $purchase_status))
            ->when($delivery_status, fn ($q) => $q->where('delivery_status', $delivery_status))
            ->when($withBalance, fn ($q) => $q->where('balance', '>', 0.009)->whereNot('status', 'canceled')->whereNot('delivery_status', 'cancelado'))
            // Rangos sobre la columna `date` (no whereDate/whereMonth: no usan índice en Postgres).
            ->when($this->dateRange($date), fn ($q, $between) => $q->whereBetween('date', $between));
    }

    /**
     * [desde, hasta] del periodo de la lista en fechas del negocio (México); null = todo el tiempo.
     * CUSTOM toma ?desde= y ?hasta= (si falta una, es un solo día; si vienen al revés, se voltean).
     */
    private function dateRange(?string $date): ?array
    {
        $now = now(config('app.business_timezone'));
        $range = fn ($from, $to) => [$from->toDateString(), $to->toDateString()];

        if ($date === 'CUSTOM') {
            $parse = function ($value) {
                try {
                    return $value ? \Carbon\Carbon::createFromFormat('Y-m-d', $value)->startOfDay() : null;
                } catch (\Throwable) {
                    return null;
                }
            };
            $from = $parse(request('desde'));
            $to = $parse(request('hasta'));
            if (! $from && ! $to) {
                return null;
            }
            $from ??= $to;
            $to ??= $from;

            return $from->gt($to) ? $range($to, $from) : $range($from, $to);
        }

        return match ($date) {
            'TODAY' => $range($now, $now),
            'YESTERDAY' => $range($now->copy()->subDay(), $now->copy()->subDay()),
            'THIS_WEEK' => $range($now->copy()->startOfWeek(), $now->copy()->endOfWeek()),
            'LAST_WEEK' => $range($now->copy()->subWeek()->startOfWeek(), $now->copy()->subWeek()->endOfWeek()),
            'THIS_MONTH' => $range($now->copy()->startOfMonth(), $now->copy()->endOfMonth()),
            'LAST_MONTH' => $range($now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->subMonthNoOverflow()->endOfMonth()),
            'THIS_YEAR' => $range($now->copy()->startOfYear(), $now->copy()->endOfYear()),
            'LAST_YEAR' => $range($now->copy()->subYear()->startOfYear(), $now->copy()->subYear()->endOfYear()),
            default => null,
        };
    }

    private function sortNotes($notes, string $sort)
    {
        // El folio es texto y puede no ser numérico. MySQL y SQLite castean sin
        // fallar (dan 0), pero en PostgreSQL `folio::integer` LANZA ERROR con
        // cualquier folio no numérico, así que ahí se filtra antes de castear.
        $folio = match (DB::getDriverName()) {
            'mysql', 'mariadb' => 'CAST(folio AS UNSIGNED)',
            // ELSE 0 y no NULL: con NULL, PostgreSQL manda los folios no
            // numéricos al final y MySQL al principio. Con 0 los tres motores
            // dan el mismo orden (verificado contra pgsql 16 y mysql 8).
            'pgsql' => 'CASE WHEN folio ~ \'^[0-9]+$\' THEN CAST(folio AS BIGINT) ELSE 0 END',
            default => 'CAST(folio AS INTEGER)',
        };

        return match ($sort) {
            'folio_desc' => $notes->orderByRaw("{$folio} DESC")->orderByDesc('folio'),
            'recientes' => $notes->orderByDesc('date')->orderByDesc('id'),
            'venta_desc' => $notes->orderByDesc('sale_total')->orderByDesc('id'),
            'saldo_desc' => $notes->orderByDesc('balance')->orderByDesc('id'),
            // Desempate estable entre folios que castean al mismo número.
            default => $notes->orderByRaw("{$folio} ASC")->orderBy('folio'),
        };
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $branch_id = currentBranchId();
        $archived = request('archived') == '1';
        $query = request('query');

        // Escanear o teclear el código del ticket (o pegar su enlace) abre esa nota directo,
        // sin importar los filtros de fecha. Si no existe, se busca como folio normal.
        if ($code = Note::extractCode($query)) {
            $found = Note::where('code', $code)->first();
            if ($found && request()->user()->canAccessBranch($found->branch_id)) {
                return redirect()->route('notes.show', $found);
            }
        }
        $date = request('date') ?? 'THIS_WEEK';
        $sort = in_array(request('sort'), self::SORTS, true) ? request('sort') : 'folio';
        $withBalance = request()->boolean('saldo');

        $filtered = $this->filteredNotes($branch_id, $archived, $query, $date, request('status'), request('purchase_status'), request('delivery_status'), $withBalance);

        // Totales de TODO el periodo filtrado (no sólo de la página); las canceladas no suman.
        $totals = (clone $filtered)->selectRaw("COUNT(*) as count,
            SUM(CASE WHEN status = 'canceled' OR delivery_status = 'cancelado' THEN 1 ELSE 0 END) as canceled,
            SUM(CASE WHEN status = 'canceled' OR delivery_status = 'cancelado' THEN 0 ELSE sale_total END) as sale,
            SUM(CASE WHEN status = 'canceled' OR delivery_status = 'cancelado' THEN 0 ELSE advance END) as collected,
            SUM(CASE WHEN status = 'canceled' OR delivery_status = 'cancelado' THEN 0 ELSE balance END) as balance,
            SUM(CASE WHEN (status = 'canceled' OR delivery_status = 'cancelado') OR balance <= 0.009 THEN 0 ELSE 1 END) as with_balance,
            SUM(CASE WHEN status = 'canceled' OR delivery_status = 'cancelado' THEN 0 ELSE purchase_total END) as purchase,
            SUM(CASE WHEN (status = 'canceled' OR delivery_status = 'cancelado') OR purchase_status <> 'pending' THEN 0 ELSE purchase_total END) as purchase_pending")->first();

        $seeCosts = request()->user()->can('costs.view');

        // Partidas, pagos y vendedor: el resumen de cada nota se despliega en la misma lista.
        $notes = $this->sortNotes($filtered, $sort)
            ->with([
                'seller:id,name',
                'items' => fn ($q) => $q->orderBy('id')->select(['id', 'note_id', 'brand', 'model', 'measure', 'mc', 'unit', 'quantity', 'price', 'discount', 'sale_subtotal', 'purchase_subtotal']),
                'payments',
            ])
            ->paginate(50)
            ->appends(request()->query());

        if (! $seeCosts) {
            $notes->getCollection()->each(function (Note $n) {
                $n->makeHidden(['purchase_total', 'purchase_status']);
                $n->items->each->makeHidden(['purchase_subtotal']);
            });
        }

        $f = fn ($v) => round((float) $v, 2);

        return Inertia::render('Notes/Index', [
            'pagination' => $notes,
            'sort' => $sort,
            'withBalance' => $withBalance,
            'today' => businessToday(),
            // Fechas exactas del periodo, para mostrarlas en el filtro.
            'dateRange' => $this->dateRange($date),
            'totals' => [
                'count' => (int) $totals->count,
                'canceled' => (int) $totals->canceled,
                'sale' => $f($totals->sale),
                'collected' => $f($totals->collected),
                'balance' => $f($totals->balance),
                'with_balance' => (int) $totals->with_balance,
                ...($seeCosts ? ['purchase' => $f($totals->purchase), 'purchase_pending' => $f($totals->purchase_pending)] : []),
            ],
        ]);
    }

    public function getPendingNotes()
    {
        $today = now()->format('Y-m-d');
        $notes = Note::with('payments')
            ->where('branch_id', currentBranchId())
            ->where('status', 'pending')
            ->whereNot('date', $today)
            ->get();

        return response()->json($notes);
    }

    public function searchNoteByFolio($branchId, $folio)
    {
        abort_unless(request()->user()->canAccessBranch((int) $branchId), 403, 'No tienes acceso a esa sucursal.');
        $note = Note::where('branch_id', $branchId)
            ->where('folio', $folio)
            ->first();

        if ($note && ! request()->user()->can('costs.view')) {
            return response()->json(CorteCosts::strip([$note])[0]);
        }

        return response()->json($note);
    }

    /**
     * Datos del corte de un día: notas emitidas ese día (con sus pagos) y los
     * pagos de ese día que corresponden a notas anteriores.
     */
    public function getNotesByDate($branch, $date, CortePaymentsService $cortePayments)
    {
        abort_unless(request()->user()->canAccessBranch((int) $branch), 403, 'No tienes acceso a esa sucursal.');
        $data = $cortePayments->forBranchAndDate((int) $branch, $date);
        if (! request()->user()->can('costs.view')) {
            $data['notes'] = CorteCosts::strip($data['notes']);
        }

        return response()->json($data);
    }
}
