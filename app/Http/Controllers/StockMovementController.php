<?php

namespace App\Http\Controllers;

use App\Services\StockService;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    //store
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'movement_type' => 'required|in:IN,OUT,ADJUSTMENT',
            'quantity' => 'required|numeric|min:1',
            'description' => 'nullable|string',
        ]);

        $currentBranchId = currentBranchId();

        $stockService = new StockService();
        $stockService->adjustStock(
            $currentBranchId,
            $validated['product_id'],
            $validated['quantity'],
            $validated['movement_type'],
            null,
            $validated['description'] ?? null
        );

        return redirect()->back()->with('success', 'Movimiento de stock registrado correctamente.');
    }
}
