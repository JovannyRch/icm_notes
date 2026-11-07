<?php

namespace App\Http\Controllers;

use App\Models\HeldSale;
use Illuminate\Http\Request;

/**
 * "Poner en espera" en caja: aparcar una venta a medio armar y recuperarla después, como en
 * SICAR. Por sucursal (no por cajero): cualquiera en ese mostrador la puede ver y recuperar.
 * No toca inventario ni crea una nota; `payload` es el mismo borrador que ya arma Caja/Index.
 */
class HeldSaleController extends Controller
{
    public function index()
    {
        $branchId = currentBranchId();
        if (! $branchId) {
            return response()->json([]);
        }

        $sales = HeldSale::with('user:id,name')
            ->where('branch_id', $branchId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($sales->map(fn (HeldSale $sale) => [
            'id' => $sale->id,
            'label' => $sale->label,
            'user' => $sale->user->name,
            'created_at' => $sale->created_at,
            'items_count' => count($sale->payload['cart'] ?? []),
            'total' => $sale->payload['total'] ?? 0,
            'payload' => $sale->payload,
        ]));
    }

    public function store(Request $request)
    {
        $branchId = currentBranchId();
        abort_unless($branchId, 422, 'Elige una sucursal primero.');

        $data = $request->validate([
            'label' => 'nullable|string|max:120',
            'payload' => 'required|array',
        ]);

        $sale = HeldSale::create([
            'branch_id' => $branchId,
            'user_id' => $request->user()->id,
            'label' => $data['label'] ?? null,
            'payload' => $data['payload'],
        ]);

        return response()->json(['id' => $sale->id]);
    }

    public function destroy(HeldSale $heldSale)
    {
        abort_unless((int) $heldSale->branch_id === currentBranchId(), 404);
        $heldSale->delete();

        return response()->json(['ok' => true]);
    }
}
