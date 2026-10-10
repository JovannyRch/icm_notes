<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Note;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Caja: venta rápida de mostrador (cajeros, y también dueños). Todo el cálculo y la
 * validación de permisos (precio, descuento y su tope) vive en SaleService.
 */
class CajaController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $branch = Branch::find(currentBranchId());

        return Inertia::render('Caja/Index', [
            'branch' => $branch?->only('id', 'name'),
            'nextFolio' => $branch ? Note::nextFolio($branch->id) : '1',
            'rules' => [
                'changePrice' => $user->can('sales.change_price'),
                'price2' => $user->can('sales.price2'),
                'updateCatalogPrice' => $user->can('sales.change_price') && $user->can('products.update_price'),
                'discount' => config('features.discounts') && $user->can('sales.discount'),
                'credit' => $user->can('sales.credit'),
                'editFolio' => $user->can('sales.edit_folio'),
                'maxDiscountPercent' => $user->isCashier() ? $user->max_discount_percent : null,
                'viewStock' => $user->can('stock.view') || $user->can('costs.view'),
                'history' => $user->can('sales.history'),
            ],
            // Producto que mandaron desde el catálogo ("Vender"): se agrega solo a la venta.
            'preload' => $this->preload($request, $branch),
            // Resumen de la venta recién cobrada (flash del store) para el diálogo de cambio.
            'lastSale' => fn () => $request->session()->get('lastSale'),
        ]);
    }

    /** Datos seguros del producto ?agregar=ID, con sus existencias en la sucursal si las puede ver. */
    private function preload(Request $request, ?Branch $branch): ?array
    {
        $product = $request->integer('agregar') ? \App\Models\Product::find($request->integer('agregar')) : null;
        if (! $product) {
            return null;
        }
        $seeStock = $request->user()->can('stock.view') || $request->user()->can('costs.view');
        $stock = $seeStock && $branch ? \App\Models\Stock::where(['branch_id' => $branch->id, 'product_id' => $product->id])->first() : null;

        return [
            ...$product->only('id', 'brand', 'model', 'measure', 'mc', 'unit'),
            // Números siempre como número: Postgres regresa decimales como texto ("12.00").
            'price' => (float) $product->price,
            'price2' => $product->price2 !== null ? (float) $product->price2 : null,
            'branch_stock' => $stock ? (float) $stock->quantity : null,
            'branch_counted_at' => $stock?->counted_at,
        ];
    }

    public function store(Request $request, SaleService $sales)
    {
        $branch = Branch::findOrFail(currentBranchId());
        abort_unless($request->user()->canAccessBranch($branch->id), 403, 'No tienes acceso a esa sucursal.');

        $data = $request->validate([
            'folio' => 'nullable|string|max:50',
            'customer' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:30',
            'customer_address' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
            'credit' => 'boolean',
            'delivery' => 'nullable|in:now,send,pickup',
            'cash' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1|max:100',
            'items.*.product_id' => 'required|integer|distinct|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100000',
            'items.*.price' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.amount' => 'nullable|numeric|min:0|max:100000000',
            'items.*.update_catalog' => 'boolean',
            'items.*.price_level' => 'nullable|in:1,2',
            'discount' => 'nullable|numeric|min:0',
            'flete' => 'nullable|numeric|min:0|max:1000000',
            'cash_received' => 'nullable|numeric|min:0',
            'card' => 'nullable|numeric|min:0',
            'card_type' => 'nullable|in:credito,debito',
            'transfer' => 'nullable|numeric|min:0',
        ], [
            'items.required' => 'Agrega al menos un producto.',
            'items.*.product_id.distinct' => 'Un producto aparece dos veces: junta las cantidades.',
            'items.*.quantity.min' => 'La cantidad debe ser al menos 1.',
        ]);

        $note = $sales->create($request->user(), $branch, $data);
        $change = $note->cash_received !== null ? round((float) $note->cash_received - (float) $note->cash, 2) : 0;

        return redirect()->route('caja')->with('lastSale', [
            'id' => $note->id,
            'folio' => $note->folio,
            'code' => $note->code,
            'total' => (float) $note->sale_total,
            'cash_received' => $note->cash_received !== null ? (float) $note->cash_received : null,
            'change' => $change,
            'balance' => round((float) $note->balance, 2),
            'catalog_updated' => $sales->lastCatalogUpdates,
        ]);
    }

    /** Ventas del día en la sucursal activa: las propias, o todas con sales.view_branch. */
    public function sales(Request $request)
    {
        $user = $request->user();
        $branch = Branch::find(currentBranchId());
        $date = businessToday();
        $allBranch = $user->can('sales.view_branch');
        // Con permiso de sucursal se ven todas; ?mias=1 filtra las propias.
        $onlyMine = ! $allBranch || $request->boolean('mias');

        // items y pagos: el resumen de cada venta se despliega en la misma lista.
        $notes = Note::with(['seller:id,name', 'items' => fn ($q) => $q->orderBy('id'), 'payments'])
            ->withCount('items')
            ->where('branch_id', $branch?->id)
            ->where('date', $date)
            ->when($onlyMine, fn ($q) => $q->where('user_id', $user->id))
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Caja/Ventas', [
            'branch' => $branch?->only('id', 'name'),
            'date' => $date,
            'allBranch' => $allBranch,
            'onlyMine' => $onlyMine,
            // Sin costos: sólo lo que el cajero cobró.
            'sales' => $notes->map(fn (Note $n) => [
                'id' => $n->id,
                'folio' => $n->folio,
                'code' => $n->code,
                'customer' => $n->customer,
                'customer_phone' => $n->customer_phone,
                'customer_address' => $n->customer_address,
                'flete' => (float) ($n->flete ?? 0),
                'cash_received' => $n->cash_received !== null ? (float) $n->cash_received : null,
                // Sólo lo que sale en el ticket: nunca costo, IVA ni extra.
                'lines' => $n->items->map(fn ($i) => [
                    'quantity' => (float) $i->quantity,
                    'description' => trim(implode(' ', array_filter([$i->brand, $i->model, $i->measure]))),
                    'mc' => $i->mc,
                    'price' => (float) $i->price,
                    'discount' => (float) ($i->discount ?? 0),
                    'amount' => (float) $i->sale_subtotal,
                ])->values(),
                'payments' => $n->payments->map(fn ($p) => [
                    'date' => substr((string) $p->date, 0, 10),
                    'cash' => (float) $p->cash,
                    'card' => (float) $p->card,
                    'card_type' => $p->card_type,
                    'transfer' => (float) $p->transfer,
                ])->values(),
                'balance' => (float) $n->balance,
                // A crédito: le queda saldo (el status no basta: las notas a mano quedan "pending" aunque estén pagadas).
                'credit' => (float) $n->balance > 0.009,
                'time' => $n->created_at?->timezone(config('app.business_timezone'))->format('H:i'),
                'items_count' => $n->items_count,
                'sale_total' => (float) $n->sale_total,
                'discount' => (float) $n->discount,
                'cash' => (float) $n->cash,
                'card' => (float) $n->card,
                'transfer' => (float) $n->transfer,
                'seller' => $n->seller?->name,
                'is_mine' => $n->user_id === $user->id,
                'canceled' => $n->delivery_status === 'cancelado' || $n->status === 'canceled',
                'delivery_status' => $n->delivery_status,
                // La última línea de cancelación del comentario (motivo, quién y cuándo).
                'cancel_reason' => collect(preg_split('/\R/', (string) $n->notes))
                    ->last(fn ($l) => str_starts_with(trim($l), SaleService::CANCEL_PREFIX)),
                'can_cancel' => $this->canCancel($request, $n),
            ]),
        ]);
    }

    public function cancel(Request $request, Note $note, SaleService $sales)
    {
        abort_unless($this->canCancel($request, $note), 403, 'No puedes cancelar esta venta.');

        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:300']], [
            'reason.required' => 'Escribe el motivo de la cancelación.',
            'reason.min' => 'Escribe el motivo de la cancelación.',
        ]);

        $sales->cancel($note, $data['reason'], $request->user());

        return back()->with('success', "Venta {$note->folio} cancelada. Las piezas regresaron al inventario.");
    }

    /** Sus propias ventas, del día, de una sucursal suya, y que no estén ya canceladas. */
    private function canCancel(Request $request, Note $note): bool
    {
        $user = $request->user();

        return $user->can('sales.cancel_own')
            && $note->user_id === $user->id
            && (string) $note->date === businessToday()
            && $user->canAccessBranch($note->branch_id)
            && ! ($note->delivery_status === 'cancelado' || $note->status === 'canceled');
    }
}
