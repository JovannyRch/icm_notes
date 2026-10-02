<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $branches = Branch::all();

        return Inertia::render('Branches/Index', [
            'branches' => $branches,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Branch $branch) {}

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Branch $branch)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Branch $branch)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Branch $branch)
    {
        //
    }

    public function getList()
    {
        // Sólo las sucursales del usuario (un cajero ve las asignadas).
        $branches = Branch::whereIn('id', auth()->user()->accessibleBranchIds())->get();

        return response()->json($branches);
    }

    /**
     * Extra (%) global de la sucursal para todos sus productos; null lo quita
     * y se vuelve a usar el extra de cada producto.
     */
    public function updateExtra(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'extra_percentage' => 'nullable|numeric|min:0|max:1000',
        ]);

        $branch->update(['extra_percentage' => $validated['extra_percentage']]);

        return redirect()->back()->with('success', $branch->extra_percentage === null
            ? "{$branch->name} vuelve a usar el extra de cada producto."
            : "Extra global de {$branch->name}: {$branch->extra_percentage}%.");
    }
}
