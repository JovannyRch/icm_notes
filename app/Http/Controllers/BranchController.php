<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    /** Sucursales y los datos que imprime cada una en el ticket. */
    public function index()
    {
        return Inertia::render('Branches/Index', [
            'branches' => Branch::orderBy('id')->get()->map(fn (Branch $b) => [
                'id' => $b->id,
                'name' => $b->name,
                // Lo guardado (para editar) y lo que se imprime (con valores por omisión).
                'ticket' => array_merge(
                    array_fill_keys(Branch::TICKET_FIELDS, ''),
                    array_intersect_key($b->ticketDefaults(), array_flip([...Branch::TICKET_TOGGLES, 'seller_mode', 'copies'])),
                    $b->ticket ?? [],
                ),
                'defaults' => $b->ticketDefaults(),
                'weekly_split' => (bool) $b->weekly_split,
            ]),
        ]);
    }

    public function updateTicket(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'business_name' => 'nullable|string|max:80',
            'rfc' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:200',
            'phone' => 'nullable|string|max:40',
            'header' => 'nullable|string|max:300',
            'footer' => 'nullable|string|max:600',
            'farewell' => 'nullable|string|max:120',
            'register_label' => 'nullable|string|max:60',
            'seller_label' => 'nullable|string|max:40',
            // Opcionales: lo que no llega conserva su valor por omisión.
            'seller_mode' => 'nullable|in:'.implode(',', Branch::SELLER_MODES),
            'copies' => 'nullable|integer|min:1|max:2',
            ...array_fill_keys(Branch::TICKET_TOGGLES, 'boolean'),
        ]);

        $branch->update(['ticket' => array_map(fn ($v) => is_string($v) ? trim($v) : $v, $validated)]);

        return redirect()->back()->with('success', "Ticket de {$branch->name} actualizado.");
    }

    /** Corte semanal: repartir la utilidad al 50% o mostrarla completa (por sucursal). */
    public function updateWeekly(Request $request, Branch $branch)
    {
        $data = $request->validate(['weekly_split' => 'required|boolean']);
        $branch->update($data);

        return redirect()->back()->with('success', $data['weekly_split']
            ? "El corte semanal de {$branch->name} reparte la utilidad al 50%."
            : "El corte semanal de {$branch->name} ya no divide la utilidad entre 2.");
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
