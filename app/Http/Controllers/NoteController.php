<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use App\Services\CortePaymentsService;
use App\Services\StockService;
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
        $date = date('Y-m-d');

        return Inertia::render('Notes/Form', [
            'branch' => $branch,
            'date' => $date,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    private function validateRequest($request)
    {
        return $request->validate([
            'folio' => 'required',
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

    private function createItems($note, $items)
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
                'supplied_status' => $item['supplied_status'],
                'delivery_status' => $item['delivery_status'],
            ]);

            if ($item['product_id']) {
                $currentBranchId = currentBranchId();
                $stockService->adjustStock(
                    $currentBranchId,
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

        if ($request->delivery_status == 'cancelado') {
            $request->merge(['status' => 'canceled']);
        }

        $items = $request->items;
        $payments = $request->input('payments', []);
        $isCancelled = $request->delivery_status == 'cancelado';

        $note = DB::transaction(function () use ($request, $items, $payments, $isCancelled) {
            $note = Note::create($request->all());
            $this->createItems($note, $items);
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
        $date = date('Y-m-d');

        $items = NoteProduct::where('note_id', $note->id)->get();

        return Inertia::render('Notes/Form', [
            'note' => $note,
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
        $items = $request->items;
        $payments = $request->input('payments', []);

        if ($request->delivery_status == 'cancelado') {
            $request->merge(['status' => 'canceled']);
        }

        $isCancelled = $request->delivery_status == 'cancelado';

        DB::transaction(function () use ($request, $note, $items, $payments, $isCancelled) {
            $note->update($request->all());

            NoteProduct::where('note_id', $note->id)->delete();
            $this->createItems($note, $items);
            $this->syncPayments($note, $payments, $isCancelled);
            $note->recalculateTotalsFromPayments();
        });

        return redirect()->route('notes.show', $note->id)->with('success', 'Nota actualizada');
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
        Note::whereIn('id', $ids)->delete();
        $total = count($ids);

        return redirect()->back()->with('success', $total.' notas eliminados');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Note $note)
    {

        $branch_id = $note->branch_id;
        $note->delete();

        return redirect()->route('notas', ['branch' => $branch_id])->with('success', 'Nota eliminada');
    }

    private function applyFilters($branch_id, $archived, $query, $date, $status, $purchase_status, $delivery_status)
    {
        $now = now()->timezone('America/Mexico_City');

        return Note::where('branch_id', $branch_id)
            ->where('archived', $archived)
            ->where(function ($q) use ($query, $date, $status, $now, $purchase_status, $delivery_status) {
                if ($query) {
                    $q->where('folio', 'like', '%'.$query.'%');
                }

                if ($status) {
                    $q->where('status', $status);
                }

                if ($purchase_status) {
                    $q->where('purchase_status', $purchase_status);
                }

                if ($delivery_status) {
                    $q->where('delivery_status', $delivery_status);
                }

                if ($date) {
                    switch ($date) {
                        case 'TODAY':
                            $q->whereDate('date', $now->toDateString());
                            break;
                        case 'YESTERDAY':
                            $q->whereDate('date', $now->clone()->subDay()->toDateString());
                            break;
                        case 'THIS_WEEK':
                            $q->whereBetween('date', [
                                $now->clone()->startOfWeek()->toDateString(),
                                $now->clone()->endOfWeek()->toDateString(),
                            ]);
                            break;
                        case 'LAST_WEEK':
                            $q->whereBetween('date', [
                                $now->clone()->subWeek()->startOfWeek()->toDateString(),
                                $now->clone()->subWeek()->endOfWeek()->toDateString(),
                            ]);
                            break;
                        case 'THIS_MONTH':
                            $q->whereMonth('date', $now->month)
                                ->whereYear('date', $now->year);
                            break;
                        case 'LAST_MONTH':
                            $q->whereMonth('date', $now->clone()->subMonth()->month)
                                ->whereYear('date', $now->clone()->subMonth()->year);
                            break;
                        case 'THIS_YEAR':
                            $q->whereYear('date', $now->year);
                            break;
                        case 'LAST_YEAR':
                            $q->whereYear('date', $now->clone()->subYear()->year);
                            break;
                    }
                }
            })
            // El folio es texto y puede no ser numérico. MySQL y SQLite castean sin
            // fallar (dan 0), pero en PostgreSQL `folio::integer` LANZA ERROR con
            // cualquier folio no numérico, así que ahí se filtra antes de castear.
            ->orderByRaw(match (DB::getDriverName()) {
                'mysql', 'mariadb' => 'CAST(folio AS UNSIGNED) ASC',
                // ELSE 0 y no NULL: con NULL, PostgreSQL manda los folios no
                // numéricos al final y MySQL al principio. Con 0 los tres motores
                // dan el mismo orden (verificado contra pgsql 16 y mysql 8).
                'pgsql' => 'CASE WHEN folio ~ \'^[0-9]+$\' THEN CAST(folio AS BIGINT) ELSE 0 END ASC',
                default => 'CAST(folio AS INTEGER) ASC',
            })
            // Desempate estable entre folios que castean al mismo número.
            ->orderBy('folio')
            ->paginate(50);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {

        $branch_id = currentBranchId();
        $archived = request('archived') == '1' ? true : false;

        $notes = null;

        $query = request('query');
        $date = request('date') ?? 'THIS_WEEK';

        $status = request('status');
        $purchase_status = request('purchase_status');
        $delivery_status = request('delivery_status');

        $notes = $this->applyFilters($branch_id, $archived, $query, $date, $status, $purchase_status, $delivery_status);

        $notes->appends(request()->query());

        return Inertia::render('Notes/Index', [
            'pagination' => $notes,
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
        $note = Note::where('branch_id', $branchId)
            ->where('folio', $folio)
            ->first();

        return response()->json($note);
    }

    /**
     * Datos del corte de un día: notas emitidas ese día (con sus pagos) y los
     * pagos de ese día que corresponden a notas anteriores.
     */
    public function getNotesByDate($branch, $date, CortePaymentsService $cortePayments)
    {
        return response()->json($cortePayments->forBranchAndDate((int) $branch, $date));
    }
}
