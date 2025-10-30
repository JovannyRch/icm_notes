<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Stock;
use App\Services\StockService;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index()
    {
        $stocks = Stock::with('product')->get();
        $products = Product::all();
        return inertia('Stock/Index', ['stocks' => $stocks, 'products' => $products]);
    }

    public function store(Request $request, StockService $stockService)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|numeric|min:0.01',
        ]);

        $stockService->adjustStock($request->product_id, $request->quantity, 'IN', null, 'Entrada manual');
        return back()->with('success', 'Existencia registrada correctamente');
    }
}
