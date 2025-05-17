<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Corte;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CorteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Branch $branch)
    {

        $filter = request('filter') ?? "THIS_MONTH";

        $cortes = Corte::where('branch_id', $branch->id)->orderBy('date', 'desc')->paginate(20);



        switch ($filter) {
            case 'THIS_MONTH':
                $cortes = Corte::where('branch_id', $branch->id)
                    ->whereMonth('date', date('m'))
                    ->whereYear('date', date('Y'))
                    ->orderBy('date', 'desc')
                    ->paginate(50);
                break;
            case 'LAST_MONTH':
                $cortes = Corte::where('branch_id', $branch->id)
                    ->whereMonth('date', date('m', strtotime('-1 month')))
                    ->whereYear('date', date('Y', strtotime('-1 month')))
                    ->orderBy('date', 'desc')
                    ->paginate(50);
                break;
            case 'THIS_YEAR':
                $cortes = Corte::where('branch_id', $branch->id)
                    ->whereYear('date', date('Y'))
                    ->orderBy('date', 'desc')
                    ->paginate(50);
                break;
            case 'LAST_YEAR':
                $cortes = Corte::where('branch_id', $branch->id)
                    ->whereYear('date', date('Y', strtotime('-1 year')))
                    ->orderBy('date', 'desc')
                    ->paginate(50);
                break;
            case 'ALL_TIME':
                $cortes = Corte::where('branch_id', $branch->id)
                    ->orderBy('date', 'desc')
                    ->paginate(50);
                break;
        }



        return Inertia::render('Cortes/Index', [
            'branch' => $branch,
            'pagination' => $cortes
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request, Branch $branch)
    {
        $date = $request->input('date') ??  date('Y-m-d');

        $notes = Note::where('branch_id', $branch->id)
            ->where('date', $date)
            ->get();

        return Inertia::render('Cortes/Form', [
            'notes' => $notes,
            'branch' => $branch,
            'date' => $date
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

            $data['expenses'] = json_decode($data['expenses'], true);
            $data['notes'] = json_decode($data['notes'], true);
            $data['previous_notes'] = json_decode($data['previous_notes'], true);
            $data['returns'] = json_decode($data['returns'], true);


            $corte = Corte::create($data);

            return redirect()->route('cortes.show', $corte);
        } catch (\Throwable $th) {
            Log::error('Error al guardar el corte: ' . $th->getMessage());
            return back()->with('error', 'Ocurrió un error al guardar el corte
            ' . $th->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Corte $corte)
    {

        $date = $corte->date;
        $branch = Branch::find($corte->branch_id);

        return Inertia::render('Cortes/Form', [
            'corte' => $corte,
            'date' => $date,
            'branch' => $branch
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
