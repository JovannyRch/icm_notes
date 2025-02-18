<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Note;
use Illuminate\Http\Request;
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
    public function store(Request $request)
    {
        //validate
        $request->validate([
            'folio' => 'required',
            'date' => 'required',
            'total' => 'required',
            'advance' => 'required',
            'branch_id' => 'required',
        ]);

        $note = Note::create($request->all());

        return redirect()->route('notes.show', $note->id)->with('success', 'Nota creada correctamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(Note $note)
    {
        $branch = $note->branch;
        return Inertia::render('Notes/Form', [
            'note' => $note,
            'branch' => $branch
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
        $request->validate([
            'folio' => 'required',
            'date' => 'required',
            'total' => 'required',
            'advance' => 'required',
            'branch_id' => 'required',
        ]);

        $note->update($request->all());
        return redirect()->route('notes.show', $note->id)->with('success', 'Nota actualizada');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Note $note)
    {
        $note->delete();
        return redirect()->route('branches.notes', $note->branch_id)->with('success', 'Nota eliminada correctamente');
    }
}
