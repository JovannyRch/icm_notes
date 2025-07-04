<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class NoteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Branch $branch)
    {
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
            'advance' => 'required',
            'balance' => 'required',
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
        ]);
    }

    private function createItems($note, $items)
    {
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
        }
    }

    public function store(Request $request)
    {
        $this->validateRequest($request);

        if ($request->delivery_status == 'cancelado') {
            $request->merge(['status' => 'canceled']);
        }

        $request = $request->merge([
            'card2' => null,
            'transfer2' => null,
            'cash2' => null,
            'second_payment_date' => null,
        ]);

        $items = $request->items;
        $note = Note::create($request->all());
        $this->createItems($note, $items);




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

        if ($request->delivery_status == 'cancelado') {
            $request->merge(['status' => 'canceled']);
        }

        $note->update($request->all());



        NoteProduct::where('note_id', $note->id)->delete();
        $this->createItems($note, $items);

        return redirect()->route('notes.show', $note->id)->with('success', 'Nota actualizada');
    }

    public function switchArchive(Note $note)
    {
        try {
            Note::where('id', $note->id)->update(['archived' => !$note->archived]);
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

        return redirect()->back()->with('success', $total . ' notas archivadas');
    }

    public function unarchiveNotes(Request $request)
    {

        $ids = $request->ids;
        Note::whereIn('id', $ids)->update(['archived' => false]);
        $total = count($ids);
        if ($total == 1) {
            return redirect()->back()->with('success', 'Nota desarchivada');
        }
        return redirect()->back()->with('success', $total . ' notas desarchivadas');
    }

    public function deleteNotes(Request $request)
    {
        $ids = $request->ids;
        Note::whereIn('id', $ids)->delete();
        $total = count($ids);
        return redirect()->back()->with('success', $total . ' notas eliminados');
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

    private function applyFilters($branch_id, $archived, $query, $date, $status)
    {
        $now = now()->timezone('America/Mexico_City');

        $notes = Note::where('branch_id', $branch_id)
            ->where('archived', $archived)
            ->where(function ($q) use ($query, $date, $status, $now) {
                if ($query) {
                    $q->where('folio', 'like', '%' . $query . '%');
                }

                if ($status) {
                    $q->where('status', $status);
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
                                $now->clone()->endOfWeek()->toDateString()
                            ]);
                            break;
                        case 'LAST_WEEK':
                            $q->whereBetween('date', [
                                $now->clone()->subWeek()->startOfWeek()->toDateString(),
                                $now->clone()->subWeek()->endOfWeek()->toDateString()
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
            ->orderByRaw(DB::getDriverName() === 'mysql' ? "CAST(folio AS UNSIGNED) ASC" : "folio::INTEGER ASC")
            ->paginate(50);

        return $notes;
    }



    public function home()
    {

        $branches = Branch::all();

        $branch_id = request('branch') ?? $branches->first()->id;
        $branch = $branches->find($branch_id);

        $archived = request('archived') == '1' ? true : false;

        $notes = null;

        $query = request('query');
        $date = request('date') ?? 'THIS_WEEK';

        $status = request('status');

        $notes = $this->applyFilters($branch_id, $archived, $query, $date, $status);

        $notes->appends(request()->query());

        return Inertia::render('Notes/Index', [
            'branch' => $branch,
            'branches' => $branches,
            'pagination' => $notes,
        ]);
    }

    public function getPendingNotes()
    {
        $today = now()->format('Y-m-d');
        $notes = Note::where('status', 'pending')->whereNot('date', $today)->get();
        return response()->json($notes);
    }

    public function searchNoteByFolio($branchId, $folio)
    {
        $note  = Note::where('branch_id', $branchId)
            ->where('folio', $folio)
            ->first();


        return response()->json($note);
    }

    public function getNotesByDate($branch, $date)
    {
        $notes = Note::where('branch_id', $branch)
            ->whereDate('date', $date)
            ->orderBy('folio', 'asc')
            ->get();

        return response()->json($notes);
    }
}
