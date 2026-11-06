<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Datos de clientes para autocompletar nombre, teléfono y dirección al vender. No hay una
 * tabla de clientes: se buscan en `notes`, que es donde se capturan (caja y notas), y se
 * agrupan para no repetir al mismo cliente varias veces. Es una búsqueda de todo el
 * negocio (no por sucursal): el mismo cliente puede comprar en cualquiera.
 */
class CustomerController extends Controller
{
    public function search(Request $request)
    {
        $query = trim((string) $request->input('query'));
        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';

        $customers = Note::query()
            ->whereNotNull('customer')
            ->where('customer', '!=', '')
            // El nombre por omisión de la caja no es un cliente real.
            ->where('customer', '!=', 'Público en general')
            ->where(fn ($q) => $q->where('customer', $like, "%{$query}%")
                ->orWhere('customer_phone', $like, "%{$query}%"))
            ->selectRaw('customer, customer_phone, customer_address, MAX(created_at) as last_used')
            ->groupBy('customer', 'customer_phone', 'customer_address')
            ->orderByDesc('last_used')
            ->limit(8)
            ->get();

        return response()->json($customers->map->only(['customer', 'customer_phone', 'customer_address']));
    }
}
