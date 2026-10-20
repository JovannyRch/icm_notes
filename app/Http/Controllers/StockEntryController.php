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
        $validated = $this->validateEntry($request);
        $branch = Branch::findOrFail(currentBranchId());

        $entry = DB::transaction(function () use ($validated, $branch, $stockService, $request) {
            $entry = new StockEntry(['branch_id' => $branch->id] + $this->header($validated));
            $entry->forceFill(['user_id' => $request->user()->id])->save();

            $this->saveItems($entry, $validated, $branch);
            foreach ($entry->items as $item) {
                $stockService->adjustStock($branch->id, $item->product_id, (float) $item->quantity, 'IN', null, $this->description($entry));
            }

            return $entry;
        });

        return redirect()->route('stock-entries.show', $entry)
            ->with('success', 'Nota de entrada #'.$entry->id.' registrada. Se sumaron '.count($validated['items']).' producto(s) al inventario.');
    }

    public function edit(StockEntry $entry)
    {
        abort_unless((int) $entry->branch_id === currentBranchId(), 404);
        $entry->load(['items.product']);

        return Inertia::render('StockEntries/Form', [
            'suppliers' => StockEntry::where('branch_id', currentBranchId())
                ->whereNotNull('supplier')->distinct()->orderBy('supplier')->pluck('supplier'),
            'entry' => [
                ...$entry->only('id', 'date', 'supplier', 'reference', 'notes', 'status'),
                'date' => $entry->date?->toDateString(),
                // Cada partida con el producto del catálogo (para comparar el costo) y lo que se capturó.
                'items' => $entry->items->map(fn (StockEntryItem $i) => [
                    'product' => $i->product,
                    'missing' => $i->product === null ? trim("{$i->brand} {$i->model} {$i->measure}") : null,
                    'quantity' => (float) $i->quantity,
                    'cost' => (float) $i->cost,
                    'iva' => (float) $i->iva,
                    'extra' => (float) $i->extra,
                ])->values(),
            ],
        ]);
    }

    /**
     * Edita la entrada. El inventario se mueve sólo por la diferencia de cada producto:
     * si subió la cantidad entra lo que falta, si bajó (o se quitó) sale lo que sobra.
     */
    public function update(Request $request, StockEntry $entry, StockService $stockService)
    {
        abort_unless((int) $entry->branch_id === currentBranchId(), 404);
        if ($entry->items()->whereNull('product_id')->exists()) {
            return back()->with('error', 'No se puede editar: un producto de esta nota ya no existe en el catálogo.');
        }
        $validated = $this->validateEntry($request);
        $branch = Branch::findOrFail($entry->branch_id);

        DB::transaction(function () use ($entry, $validated, $branch, $stockService) {
            $before = $entry->items()->get()->groupBy('product_id')->map(fn ($rows) => (float) $rows->sum('quantity'));

            $entry->update($this->header($validated));
            $entry->items()->delete();
            $this->saveItems($entry, $validated, $branch);
            $after = $entry->items->groupBy('product_id')->map(fn ($rows) => (float) $rows->sum('quantity'));

            $description = 'Edición de nota de entrada #'.$entry->id.($entry->supplier ? ' - '.$entry->supplier : '');
            foreach ($before->keys()->merge($after->keys())->unique() as $productId) {
                $diff = round(($after[$productId] ?? 0) - ($before[$productId] ?? 0), 2);
                if (abs($diff) >= 0.005) {
                    $stockService->adjustStock($branch->id, (int) $productId, abs($diff), $diff > 0 ? 'IN' : 'OUT', null, $description, false);
                }
            }
        });

        return redirect()->route('stock-entries.show', $entry)->with('success', 'Nota de entrada #'.$entry->id.' actualizada; el inventario se ajustó por la diferencia.');
    }

    /** Elimina la entrada y regresa sus piezas (salen del inventario de la sucursal). */
    public function destroy(StockEntry $entry, StockService $stockService)
    {
        abort_unless((int) $entry->branch_id === currentBranchId(), 404);

        DB::transaction(function () use ($entry, $stockService) {
            $description = 'Eliminación de nota de entrada #'.$entry->id.($entry->supplier ? ' - '.$entry->supplier : '');
            foreach ($entry->items()->whereNotNull('product_id')->get() as $item) {
                $stockService->adjustStock($entry->branch_id, $item->product_id, (float) $item->quantity, 'OUT', null, $description, false);
            }
            $entry->delete(); // las partidas se borran en cascada
        });

        return redirect()->route('stock-entries.index')->with('success', 'Nota de entrada #'.$entry->id.' eliminada; sus piezas salieron del inventario.');
    }

    private function validateEntry(Request $request): array
    {
        return $request->validate([
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
    }

    /** Datos generales de la entrada (fecha, proveedor, factura, comentarios, pago). */
    private function header(array $validated): array
    {
        return [
            'date' => $validated['date'],
            'supplier' => trim((string) ($validated['supplier'] ?? '')) ?: null,
            'reference' => trim((string) ($validated['reference'] ?? '')) ?: null,
            'notes' => trim((string) ($validated['notes'] ?? '')) ?: null,
            'status' => ! empty($validated['paid']) ? 'paid' : 'pending',
        ];
    }

    private function description(StockEntry $entry): string
    {
        return 'Nota de entrada #'.$entry->id.($entry->supplier ? ' - '.$entry->supplier : '');
    }

    /**
     * Crea las partidas con su costo, IVA y extra (el extra global de la sucursal manda), guarda
     * el total y, si se pidió, los costos nuevos en el catálogo. No mueve inventario.
     */
    private function saveItems(StockEntry $entry, array $validated, Branch $branch): void
    {
        $globalExtra = $branch->extra_percentage;
        $products = Product::whereIn('id', collect($validated['items'])->pluck('product_id'))->get()->keyBy('id');
        $total = 0.0;

        foreach ($validated['items'] as $item) {
            $product = $products->get($item['product_id']);
            $quantity = round((float) $item['quantity'], 2);
            $cost = round((float) $item['cost'], 2);
            $iva = round((float) ($item['iva'] ?? 0), 2);
            // El extra global manda, salvo en los productos marcados "sin extra global" (esos llevan el que se capture).
            $extra = $globalExtra !== null && ! $product->skip_global_extra ? (float) $globalExtra : round((float) ($item['extra'] ?? 0), 2);
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

            // Costo nuevo del proveedor: se guarda en el catálogo si así se pidió.
            if (! empty($validated['update_catalog'])) {
                $changes = array_filter([
                    'cost' => abs($cost - (float) $product->cost) >= 0.005 ? $cost : null,
                    'iva' => abs($iva - (float) $product->iva) >= 0.005 ? $iva : null,
                    'extra' => ($globalExtra === null || $product->skip_global_extra) && abs($extra - (float) $product->extra) >= 0.005 ? $extra : null,
                ], fn ($v) => $v !== null);
                if ($changes) {
                    Log::info('Costo actualizado desde nota de entrada', ['product_id' => $product->id, 'antes' => $product->only(array_keys($changes)), 'ahora' => $changes, 'entrada' => $entry->id]);
                    $product->update($changes);
                }
            }
        }

        $entry->update(['total' => round($total, 2)]);
        $entry->load('items');
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
