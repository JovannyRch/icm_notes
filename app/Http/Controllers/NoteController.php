<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
        return Inertia::render('Notes/Form', [
            'branch' => $branch
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
            'purchase_total' => 'required',
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

        $items = NoteProduct::where('note_id', $note->id)->get();

        return Inertia::render('Notes/Form', [
            'note' => $note,
            'branch' => $branch,
            'items' => $items,
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
        $branch_id = $request->branch;
        $ids = $request->ids;

        Note::whereIn('id', $ids)->update(['archived' => true]);
        $total = count($ids);
        return redirect()->back()->with('success', $total . ' notas archivadas');
    }

    public function unarchiveNotes(Request $request)
    {

        $ids = $request->ids;
        Note::whereIn('id', $ids)->update(['archived' => false]);
        $total = count($ids);
        return redirect()->back()->with('success', $total . ' notas desarchivadas');
    }

    //delete items
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

        $notes = Note::where('branch_id', $branch_id)
            ->where('archived', $archived)
            ->where(function ($q) use ($query, $date, $status) {
                if ($query) {
                    $q->where('folio', 'like', '%' . $query . '%');
                }

                if ($status) {
                    $q->where('status', $status);
                }

                if ($date) {
                    switch ($date) {
                        case 'TODAY':
                            $q->whereDate('date', now());
                            break;
                        case 'YESTERDAY':
                            $q->whereDate('date', now()->subDay());
                            break;
                        case 'THIS_WEEK':
                            $q->whereBetween('date', [now()->startOfWeek(), now()->endOfWeek()]);
                            break;
                        case 'LAST_WEEK':
                            $q->whereBetween('date', [now()->subWeek()->startOfWeek(), now()->subWeek()->endOfWeek()]);
                            break;
                        case 'THIS_MONTH':
                            $q->whereMonth('date', now()->month);
                            break;
                        case 'LAST_MONTH':
                            $q->whereMonth('date', now()->subMonth()->month);
                            break;
                        case 'THIS_YEAR':
                            $q->whereYear('date', now()->year);
                            break;
                        case 'LAST_YEAR':
                            $q->whereYear('date', now()->subYear()->year);
                            break;
                        case 'ALL_TIME':
                            break;

                        default:

                            break;
                    }
                }
            })
            ->orderBy('date', 'desc')
            ->paginate(10);


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
}
