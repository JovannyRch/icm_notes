<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\StockEntry;
use App\Models\StockEntryItem;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Notas de entrada: compras a proveedores. Cada una se guarda como documento (con sus
 * partidas a costo, IVA y extra) y suma sus piezas al inventario de la sucursal activa
 * como movimientos IN. El total es lo que se le paga al proveedor.
 */
class StockEntryController extends Controller
{
    public function index(Request $request)
    {
        $branchId = currentBranchId();
        $search = trim((string) $request->input('query', ''));
        $status = in_array($request->input('estado'), ['pending', 'paid'], true) ? $request->input('estado') : null;
        $from = $this->validDate($request->input('desde'));
        $to = $this->validDate($request->input('hasta'));
        if ($from && $to && $from > $to) {
            [$from, $to] = [$to, $from];
        }

        $filtered = StockEntry::query()
            ->where('branch_id', $branchId)
            ->when($search !== '', function ($q) use ($search) {
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
                $q->where(function ($q) use ($search, $like) {
                    $q->where('supplier', $like, "%{$search}%")
                        ->orWhere('reference', $like, "%{$search}%")
                        ->orWhereHas('items', fn ($i) => $i->where('model', $like, "%{$search}%")->orWhere('brand', $like, "%{$search}%"));
                    if (ctype_digit(ltrim($search, '#'))) {
                        $q->orWhere('id', (int) ltrim($search, '#'));
                    }
                });
            })
            ->when($from, fn ($q) => $q->where('date', '>=', $from))
            ->when($to, fn ($q) => $q->where('date', '<=', $to));

        $totals = (clone $filtered)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total), 0) as total')
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0) as pending")
            ->selectRaw("COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count")
            ->first();

        $entries = $filtered
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['user:id,name', 'items'])
            ->orderByDesc('date')->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('StockEntries/Index', [
            'pagination' => $entries,
            'filters' => ['query' => $search, 'estado' => $status, 'desde' => $from, 'hasta' => $to],
            'totals' => [
                'count' => (int) $totals->count,
                'total' => round((float) $totals->total, 2),
                'pending' => round((float) $totals->pending, 2),
                'pending_count' => (int) $totals->pending_count,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('StockEntries/Form', [
            'suppliers' => StockEntry::where('branch_id', currentBranchId())
                ->whereNotNull('supplier')->distinct()->orderBy('supplier')->pluck('supplier'),
        ]);
    }

    public function show(StockEntry $entry)
    {
        abort_unless((int) $entry->branch_id === currentBranchId(), 404);

        return Inertia::render('StockEntries/Show', [
            'entry' => $entry->load(['items', 'user:id,name', 'branch:id,name']),
        ]);
    }

    public function store(Request $request, StockService $stockService)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'supplier' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'paid' => 'boolean',
            'update_catalog' => 'boolean',
            'items' => 'required|array|min:1|max:200',
            'items.*.product_id' => 'required|distinct|exists:products,id',
            'items.*.quantity' => 'required|numeric|gt:0|max:1000000',
            'items.*.cost' => 'required|numeric|min:0|max:100000000',
            'items.*.iva' => 'nullable|numeric|min:0|max:100',
            'items.*.extra' => 'nullable|numeric|min:0|max:1000',
        ], [
            'items.required' => 'Agrega al menos un producto.',
            'items.min' => 'Agrega al menos un producto.',
            'items.*.product_id.distinct' => 'El producto está repetido.',
            'items.*.quantity.gt' => 'La cantidad debe ser mayor a 0.',
            'items.*.cost.required' => 'Escribe el costo.',
        ]);

        $branch = Branch::findOrFail(currentBranchId());
        $globalExtra = $branch->extra_percentage; // el extra global de la sucursal manda
        $products = Product::whereIn('id', collect($validated['items'])->pluck('product_id'))->get()->keyBy('id');

        $entry = DB::transaction(function () use ($validated, $branch, $globalExtra, $products, $stockService, $request) {
            $entry = new StockEntry([
                'branch_id' => $branch->id,
                'date' => $validated['date'],
                'supplier' => trim((string) ($validated['supplier'] ?? '')) ?: null,
                'reference' => trim((string) ($validated['reference'] ?? '')) ?: null,
                'notes' => trim((string) ($validated['notes'] ?? '')) ?: null,
                'status' => ! empty($validated['paid']) ? 'paid' : 'pending',
            ]);
            $entry->forceFill(['user_id' => $request->user()->id])->save();

            $description = 'Nota de entrada #'.$entry->id.($entry->supplier ? ' - '.$entry->supplier : '');
            $total = 0.0;

            foreach ($validated['items'] as $item) {
                $product = $products->get($item['product_id']);
                $quantity = round((float) $item['quantity'], 2);
                $cost = round((float) $item['cost'], 2);
                $iva = round((float) ($item['iva'] ?? 0), 2);
                $extra = $globalExtra !== null ? (float) $globalExtra : round((float) ($item['extra'] ?? 0), 2);
                $subtotal = StockEntryItem::subtotalFor($cost, $quantity, $iva, $extra);
                $total += $subtotal;

                $entry->items()->create([
                    'product_id' => $product->id,
                    'brand' => $product->brand,
                    'model' => $product->model,
                    'measure' => $product->measure,
                    'mc' => $product->mc,
                    'unit' => $product->unit,
                    'quantity' => $quantity,
                    'cost' => $cost,
                    'iva' => $iva,
                    'extra' => $extra,
                    'subtotal' => $subtotal,
                ]);

                $stockService->adjustStock($branch->id, $product->id, $quantity, 'IN', null, $description);

                // Costo nuevo del proveedor: se guarda en el catálogo si así se pidió.
                if (! empty($validated['update_catalog'])) {
                    $changes = array_filter([
                        'cost' => abs($cost - (float) $product->cost) >= 0.005 ? $cost : null,
                        'iva' => abs($iva - (float) $product->iva) >= 0.005 ? $iva : null,
                        'extra' => $globalExtra === null && abs($extra - (float) $product->extra) >= 0.005 ? $extra : null,
                    ], fn ($v) => $v !== null);
                    if ($changes) {
                        Log::info('Costo actualizado desde nota de entrada', ['product_id' => $product->id, 'antes' => $product->only(array_keys($changes)), 'ahora' => $changes, 'entrada' => $entry->id]);
                        $product->update($changes);
                    }
                }
            }

            $entry->update(['total' => round($total, 2)]);

            return $entry;
        });

        return redirect()->route('stock-entries.show', $entry)
            ->with('success', 'Nota de entrada #'.$entry->id.' registrada. Se sumaron '.count($validated['items']).' producto(s) al inventario.');
    }

    /** Marca la entrada como pagada al proveedor (o la regresa a por pagar). */
    public function updateStatus(Request $request, StockEntry $entry)
    {
        abort_unless((int) $entry->branch_id === currentBranchId(), 404);
        $data = $request->validate(['status' => 'required|in:pending,paid']);
        $entry->update($data);

        return back()->with('success', $data['status'] === 'paid'
            ? 'Nota de entrada #'.$entry->id.' marcada como pagada al proveedor.'
            : 'Nota de entrada #'.$entry->id.' marcada como por pagar.');
    }

    private function validDate(?string $value): ?string
    {
        return $value && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && strtotime($value) ? $value : null;
    }
}
