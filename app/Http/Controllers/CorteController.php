<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Corte;
use App\Services\CortePaymentsService;
use App\Support\CorteCosts;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CorteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $branch = Branch::find(currentBranchId());
        $filter = request('filter') ?? 'THIS_MONTH';
        // El mes y el año del negocio (México), no los del servidor en UTC.
        $today = now(config('app.business_timezone'));
        $lastMonth = $today->copy()->subMonthNoOverflow();

        $query = Corte::where('branch_id', $branch->id);
        match ($filter) {
            'LAST_MONTH' => $query->whereBetween('date', [$lastMonth->copy()->startOfMonth()->toDateString(), $lastMonth->copy()->endOfMonth()->toDateString()]),
            'THIS_YEAR' => $query->whereBetween('date', [$today->copy()->startOfYear()->toDateString(), $today->copy()->endOfYear()->toDateString()]),
            'LAST_YEAR' => $query->whereBetween('date', [$today->copy()->subYear()->startOfYear()->toDateString(), $today->copy()->subYear()->endOfYear()->toDateString()]),
            'ALL_TIME' => null,
            default => $query->whereBetween('date', [$today->copy()->startOfMonth()->toDateString(), $today->copy()->endOfMonth()->toDateString()]),
        };

        // Totales de TODO el periodo (no sólo de la página).
        $totals = (clone $query)->selectRaw('COUNT(*) as count, COALESCE(SUM(sale_total), 0) as sale, COALESCE(SUM(cash_total), 0) as cash,
            COALESCE(SUM(card_total), 0) as card, COALESCE(SUM(transfer_total), 0) as transfer, COALESCE(SUM(expenses_total), 0) as expenses')->first();

        $cortes = $query->orderBy('date', 'desc')->orderBy('id', 'desc')->paginate(50)->appends(request()->query());

        // Días con más de un corte: se marcan para revisar (puede ser un corte repetido).
        $repeated = Corte::where('branch_id', $branch->id)->whereIn('date', collect($cortes->items())->pluck('date')->all())
            ->select('date')->groupBy('date')->havingRaw('COUNT(*) > 1')->pluck('date')
            ->map(fn ($d) => substr((string) $d, 0, 10))->values();

        $todayDate = businessToday();

        return Inertia::render('Cortes/Index', [
            'branch' => $branch,
            'pagination' => $cortes,
            'filter' => $filter,
            'totals' => [
                'count' => (int) $totals->count,
                'sale' => (float) $totals->sale,
                'cash' => (float) $totals->cash,
                'card' => (float) $totals->card,
                'transfer' => (float) $totals->transfer,
                'expenses' => (float) $totals->expenses,
            ],
            'repeatedDates' => $repeated,
            'today' => $todayDate,
            'todayCorteId' => Corte::where('branch_id', $branch->id)->where('date', $todayDate)->orderByDesc('id')->value('id'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request, CortePaymentsService $cortePayments)
    {
        $branch_id = currentBranchId();
        $branch = Branch::find($branch_id);
        $date = $request->input('date') ?? businessToday();

        $data = $cortePayments->forBranchAndDate((int) $branch->id, $date);

        return Inertia::render('Cortes/Form', [
            // El cajero no ve compras: se quitan aquí y el servidor las repone al guardar.
            'notes' => $request->user()->can('costs.view') ? $data['notes'] : CorteCosts::strip($data['notes']),
            'previous_payments' => $data['previous_payments'],
            'branch' => $branch,
            'date' => $date,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'date' => 'required | date',
                'sale_total' => 'required | numeric',
                'notes_total' => 'required | numeric',
                'cash_total' => 'required | numeric',
                'card_total' => 'required | numeric',
                'transfer_total' => 'required | numeric',
                'previous_notes_total' => 'required | numeric',
                'expenses_total' => 'required | numeric',
                'expenses' => 'required | string',
                'notes' => 'required | string',
                'returns' => 'required | string',
                'previous_notes' => 'required | string',
                'branch_id' => 'required| integer',
            ]);

            abort_unless($request->user()->canAccessBranch((int) $data['branch_id']), 403, 'No tienes acceso a esa sucursal.');

            $data['expenses'] = json_decode($data['expenses'], true);
            // El total de compra de cada nota sale de la base, no del navegador (el cajero no lo tiene).
            $data['notes'] = CorteCosts::fill(json_decode($data['notes'], true) ?? []);
            $data['previous_notes'] = json_decode($data['previous_notes'], true);
            $data['returns'] = json_decode($data['returns'], true);

            $corte = Corte::create($data);

            return redirect()->route('cortes.show', $corte);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException|\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $th) {
            Log::error('Error al guardar el corte: '.$th->getMessage());

            return back()->with('error', 'Ocurrió un error al guardar el corte
            '.$th->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Corte $corte)
    {
        abort_unless($request->user()->canAccessBranch((int) $corte->branch_id), 403, 'No tienes acceso a esa sucursal.');

        $date = $corte->date;
        $branch = Branch::find($corte->branch_id);

        $payload = $corte->toArray();
        if (! $request->user()->can('costs.view')) {
            $payload['notes'] = CorteCosts::strip($corte->notes ?? []);
        }

        return Inertia::render('Cortes/Form', [
            'corte' => $payload,
            'date' => $date,
            'branch' => $branch,
        ]);
    }

    public function export(Corte $corte)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Corte $corte)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Corte $corte)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Corte $corte)
    {
        $corte->delete();

        return redirect()->route('cortes', $corte->branch_id)->with('success', 'Corte eliminado correctamente');
    }
}
