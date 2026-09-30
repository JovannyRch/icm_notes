<?php

namespace App\Http\Controllers;

use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Nota de entrada: registers purchased products (already in the catalog)
 * as IN stock movements for the current branch.
 */
class StockEntryController extends Controller
{
    public function create()
    {
        return Inertia::render('StockEntries/Form');
    }

    public function store(Request $request, StockService $stockService)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'reference' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|distinct|exists:products,id',
            'items.*.quantity' => 'required|numeric|gt:0',
        ], [
            'items.required' => 'Agrega al menos un producto.',
            'items.min' => 'Agrega al menos un producto.',
            'items.*.product_id.distinct' => 'El producto está repetido.',
            'items.*.quantity.gt' => 'La cantidad debe ser mayor a 0.',
        ]);

        $branchId = currentBranchId();

        $description = 'Nota de entrada '.$validated['date'];
        if (! empty($validated['reference'])) {
            $description .= ' - '.$validated['reference'];
        }

        DB::transaction(function () use ($validated, $branchId, $stockService, $description) {
            foreach ($validated['items'] as $item) {
                $stockService->adjustStock(
                    $branchId,
                    $item['product_id'],
                    $item['quantity'],
                    'IN',
                    null,
                    $description
                );
            }
        });

        return redirect()->route('stock-entries.create')
            ->with('success', 'Nota de entrada registrada. Se actualizó el stock de '.count($validated['items']).' producto(s).');
    }
}
