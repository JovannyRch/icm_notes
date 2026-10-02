<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Stock;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    private function validateRequest($request)
    {
        return $request->validate([
            'brand' => 'required',
            'model' => 'required',
            'iva' => 'numeric',
            'extra' => 'numeric',
            'stock' => 'numeric',
            'price' => 'numeric',
            'cost' => 'numeric',
        ]);
    }

    /** Filtros de estado de la lista (?estado=). */
    public const STATUSES = ['sin_precio', 'sin_costo', 'con_perdida', 'agotados', 'sin_inventario', 'con_existencias'];

    /** Órdenes de la lista (?sort=). */
    public const SORTS = ['id', 'marca', 'precio_asc', 'precio_desc', 'existencias', 'recientes'];

    /**
     * Expresiones SQL de la lista sobre `products` + `stocks as s` (la sucursal activa).
     * El costo real es el de calculatePurchaseSubtotal(): costo × (1 + IVA) × (1 + extra),
     * y el extra global de la sucursal reemplaza al del producto. Funcionan igual en
     * SQLite, MySQL y PostgreSQL.
     */
    private function listSql(?float $globalExtra): array
    {
        $extra = $globalExtra !== null ? (string) (float) $globalExtra : 'COALESCE(products.extra, 0)';
        $realCost = "COALESCE(products.cost, 0) * (1 + COALESCE(products.iva, 0) / 100.0) * (1 + {$extra} / 100.0)";

        return [
            'real_cost' => $realCost,
            'sin_precio' => 'COALESCE(products.price, 0) <= 0',
            'sin_costo' => 'COALESCE(products.cost, 0) <= 0',
            'con_perdida' => "COALESCE(products.price, 0) > 0 AND COALESCE(products.cost, 0) > 0 AND products.price < {$realCost}",
            // Misma regla que showsStock(): se muestra el número si se contó o si ya se movió.
            'agotados' => '((s.counted_at IS NOT NULL AND s.quantity <= 0) OR s.quantity < 0)',
            'sin_inventario' => '(s.id IS NULL OR (s.counted_at IS NULL AND s.quantity = 0))',
            'con_existencias' => 's.quantity > 0',
        ];
    }

    public function index(Request $request)
    {
        $branchId = currentBranchId();
        $search = trim((string) $request->input('query'));
        $brand = $request->input('brand');
        $status = in_array($request->input('estado'), self::STATUSES, true) ? $request->input('estado') : null;
        $sort = in_array($request->input('sort'), self::SORTS, true) ? $request->input('sort') : 'id';
        $sql = $this->listSql(Branch::find($branchId)?->extra_percentage);

        $base = Product::query()->leftJoin('stocks as s', function ($join) use ($branchId) {
            $join->on('s.product_id', '=', 'products.id')->where('s.branch_id', '=', $branchId);
        });
        if ($search !== '') {
            $this->applySearch($base, $search);
        }
        if ($brand) {
            $base->where('products.brand', $brand);
        }

        // Conteos de cada filtro y valor del inventario, con la búsqueda y la marca actuales.
        $counts = collect(self::STATUSES)->map(fn ($key) => "SUM(CASE WHEN {$sql[$key]} THEN 1 ELSE 0 END) as {$key}")->implode(', ');
        $row = (clone $base)->selectRaw("COUNT(*) as total, {$counts},
            SUM(CASE WHEN s.quantity > 0 THEN s.quantity ELSE 0 END) as stock_units,
            SUM(CASE WHEN s.quantity > 0 THEN s.quantity * COALESCE(products.price, 0) ELSE 0 END) as stock_price,
            SUM(CASE WHEN s.quantity > 0 THEN s.quantity * {$sql['real_cost']} ELSE 0 END) as stock_cost")->first();

        $query = (clone $base)->select('products.*')->with('stock');
        if ($status) {
            $query->whereRaw($sql[$status]);
        }
        match ($sort) {
            'marca' => $query->orderBy('products.brand')->orderBy('products.model'),
            'precio_asc' => $query->orderByRaw('COALESCE(products.price, 0) asc'),
            'precio_desc' => $query->orderByRaw('COALESCE(products.price, 0) desc'),
            // Sin registro de existencias al final.
            'existencias' => $query->orderByRaw('CASE WHEN s.id IS NULL THEN 1 ELSE 0 END')->orderByRaw('COALESCE(s.quantity, 0) desc'),
            'recientes' => $query->orderByDesc('products.updated_at'),
            default => null,
        };
        // orderBy('id') siempre al final: Postgres reordena filas tras un UPDATE y la edición rápida las movería de página.
        $pagination = $query->orderBy('products.id')->paginate(50)->appends($request->query());

        return Inertia::render('Products/Index', [
            'pagination' => $pagination,
            'brands' => Product::whereNotNull('brand')->where('brand', '!=', '')->distinct()->orderBy('brand')->pluck('brand'),
            'filters' => ['query' => $search, 'brand' => $brand, 'estado' => $status, 'sort' => $sort],
            'summary' => [
                'total' => (int) $row->total,
                ...collect(self::STATUSES)->mapWithKeys(fn ($key) => [$key => (int) $row->{$key}])->all(),
                'stock_units' => (float) $row->stock_units,
                'stock_price' => (float) $row->stock_price,
                'stock_cost' => (float) $row->stock_cost,
            ],
        ]);
    }

    /**
     * Ajuste masivo del precio público o del costo: a los productos seleccionados o a
     * toda una marca, en % o en pesos, con redondeo opcional.
     */
    public function bulkPrice(Request $request)
    {
        $data = $request->validate([
            'ids' => ['nullable', 'array', 'max:5000'],
            'ids.*' => ['integer'],
            'brand' => ['nullable', 'string', 'max:255'],
            'field' => ['required', Rule::in(['price', 'cost'])],
            'mode' => ['required', Rule::in(['percent', 'amount'])],
            'value' => ['required', 'numeric', 'not_in:0', 'min:-1000000', 'max:1000000'],
            'round' => ['required', Rule::in(['none', 'peso', 'diez'])],
        ], [
            'value.required' => 'Escribe cuánto cambia el precio.',
            'value.not_in' => 'Escribe un cambio distinto de 0.',
        ]);

        if (empty($data['ids']) && empty($data['brand'])) {
            throw ValidationException::withMessages(['ids' => 'Elige productos o una marca.']);
        }
        if ($data['mode'] === 'percent' && $data['value'] <= -100) {
            throw ValidationException::withMessages(['value' => 'No se puede bajar 100% o más.']);
        }

        $products = Product::query()
            ->when(! empty($data['ids']), fn ($q) => $q->whereIn('id', $data['ids']))
            ->when(empty($data['ids']), fn ($q) => $q->where('brand', $data['brand']))
            ->get(['id', $data['field']]);

        $field = $data['field'];
        $value = (float) $data['value'];
        $changed = 0;
        $skipped = 0;

        DB::transaction(function () use ($products, $field, $value, $data, &$changed, &$skipped) {
            foreach ($products as $product) {
                $before = (float) $product->{$field};
                $after = $data['mode'] === 'percent' ? $before * (1 + $value / 100) : $before + $value;
                $after = match ($data['round']) {
                    'peso' => round($after),
                    'diez' => round($after / 10) * 10,
                    default => round($after, 2),
                };
                // Sin precio (0) en % no cambia, y nada puede quedar negativo.
                if ($after < 0 || abs($after - $before) < 0.005) {
                    $skipped++;

                    continue;
                }
                $product->update([$field => $after]);
                $changed++;
            }
        });

        Log::info('Ajuste masivo de precios', ['field' => $field, 'mode' => $data['mode'], 'value' => $value, 'round' => $data['round'],
            'brand' => $data['brand'] ?? null, 'productos' => $changed, 'user_id' => $request->user()->id]);

        $label = $field === 'price' ? 'precio público' : 'costo';
        $message = $changed === 1 ? "Se actualizó el {$label} de 1 producto." : "Se actualizó el {$label} de {$changed} productos.";
        if ($skipped > 0) {
            $message .= " {$skipped} sin cambio (sin precio, o quedaría negativo).";
        }

        return back()->with($changed > 0 ? 'success' : 'error', $changed > 0 ? $message : 'Ningún producto cambió.');
    }

    public function getAll()
    {
        $products = Product::all();

        return response()->json($products);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        // ?duplicar={id}: el formulario llega con los datos de ese producto (sin existencias),
        // p. ej. el mismo modelo con otro m² por caja.
        $source = $request->integer('duplicar') ? Product::find($request->integer('duplicar')) : null;

        return Inertia::render('Products/Form', [
            'duplicate' => $source?->only(['brand', 'model', 'measure', 'mc', 'unit', 'iva', 'extra', 'price', 'cost']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->validateRequest($request);
        $product = Product::create($request->all());

        if ($request->has('stock')) {
            $currentBranchId = currentBranchId();
            $stockService = new StockService;
            $stockService->adjustStock($currentBranchId, $product->id, $request->input('stock'), 'ADJUSTMENT', null, 'Ajuste inicial al crear producto');
        }

        return redirect()->route('products.show', $product->id)->with('success', 'Producto registrado correctamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Product $product)
    {
        $product->load('stock');
        $stockMovements = $product->stockMovements()
            ->with('branch')
            ->orderBy('created_at', 'desc')
            ->paginate(50)
            ->appends($request->only('tab'));

        return Inertia::render('Products/Form', [
            'product' => $product,
            'stockMovements' => $stockMovements,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {

        $this->validateRequest($request);
        $product->update($request->all());

        if ($request->has('stock')) {

            $currentBranchId = currentBranchId();
            $stockService = new StockService;

            $existingStock = Stock::where('branch_id', $currentBranchId)
                ->where('product_id', $product->id)
                ->first();

            $stockService->adjustStock($currentBranchId, $product->id, $request->input('stock'), 'ADJUSTMENT', null, 'Ajuste desde actualización de producto');
        }

        return redirect()->route('products.show', $product->id)->with('success', 'Producto actualizado correctamente.');
    }

    /** Campos que se editan directo en la lista de productos (lo que cambia seguido). */
    public const QUICK_FIELDS = ['price', 'cost', 'iva', 'extra', 'stock'];

    /**
     * Edición rápida de un campo desde la lista (JSON, sin recargar la página).
     * Las existencias son de la sucursal activa y quedan como ajuste (conteo) en el historial.
     */
    public function quickUpdate(Request $request, Product $product)
    {
        $data = $request->validate([
            'field' => ['required', Rule::in(self::QUICK_FIELDS)],
            'value' => ['required', 'numeric', 'min:0', $request->input('field') === 'stock' ? 'max:1000000' : 'max:10000000'],
        ], [
            'value.required' => 'Escribe un valor.',
            'value.numeric' => 'Escribe sólo números.',
            'value.min' => 'No puede ser negativo.',
        ]);

        $value = (float) $data['value'];

        if ($data['field'] === 'stock') {
            abort_unless($request->user()->can('stock.manage'), 403, 'No puedes ajustar existencias.');
            $branchId = currentBranchId();
            $current = Stock::where(['branch_id' => $branchId, 'product_id' => $product->id])->first();
            // Mismo número y ya contado: no se agrega un movimiento de más al historial.
            if (! $current || ! $current->counted_at || abs((float) $current->quantity - $value) >= 0.0001) {
                (new StockService)->adjustStock($branchId, $product->id, $value, 'ADJUSTMENT', null, 'Ajuste rápido desde la lista de productos');
            }
        } else {
            $product->update([$data['field'] => $value]);
        }

        $stock = Stock::where(['branch_id' => currentBranchId(), 'product_id' => $product->id])->first();

        return response()->json([
            'id' => $product->id,
            'price' => (float) $product->price,
            'cost' => (float) $product->cost,
            'iva' => (float) $product->iva,
            'extra' => (float) $product->extra,
            'stock' => $stock ? ['quantity' => (float) $stock->quantity, 'counted_at' => $stock->counted_at] : null,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        try {
            $product->delete();

            return redirect()->route('products')->with('success', 'Producto eliminado correctamente.');
        } catch (\Throwable $th) {
            return redirect()->back()->with('error', 'Error al eliminar el producto.');
        }
    }

    public function destroyItems(Request $request)
    {
        try {
            $ids = $request->ids;
            Product::destroy($ids);

            return redirect()->back()->with('success', 'Productos eliminados correctamente.');
        } catch (\Throwable $th) {
            return redirect()->back()->with('error', 'Error al eliminar los productos.');
        }
    }

    public function destroyAll(Request $request)
    {
        try {

            $brand = $request->input('brand');

            if ($brand) {
                Product::where('brand', $brand)->delete();
            } else {
                DB::table('products')->delete();
            }

            return redirect()->route('products')->with('success', 'Productos eliminados correctamente.');
        } catch (\Throwable $th) {
            return redirect()->back()->with('error', 'Error al eliminar los productos.');
        }
    }

    /** Cada palabra debe aparecer en alguna columna (columnas calificadas: la lista une `stocks`). */
    private function applySearch($products, string $query, bool $matchCost = true)
    {
        $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';

        foreach (array_filter(explode(' ', $query), fn ($k) => $k !== '') as $keyword) {
            $products->where(function ($q) use ($keyword, $likeOperator, $matchCost) {
                $q->orWhere('products.model', $likeOperator, "%{$keyword}%")
                    ->orWhere('products.measure', $likeOperator, "%{$keyword}%")
                    ->orWhere('products.mc', $likeOperator, "%{$keyword}%")
                    ->orWhere('products.unit', $likeOperator, "%{$keyword}%")
                    ->orWhere('products.price', $likeOperator, "%{$keyword}%")
                    // Quien no ve costos tampoco puede deducirlos buscando por número.
                    ->when($matchCost, fn ($q) => $q->orWhere('products.cost', $likeOperator, "%{$keyword}%"))
                    ->orWhere('products.brand', $likeOperator, "%{$keyword}%");
            });
        }

        return $products;
    }

    public function getSearchQuery($query, $brand = null, bool $matchCost = true)
    {
        $products = $this->applySearch(Product::query(), (string) $query, $matchCost);

        if ($brand) {
            $products->where('brand', $brand);
        }

        $products->with('stock');

        return $products;
    }

    public function search(Request $request)
    {

        $query = $request->input('query');

        $products = $this->getSearchQuery($query, null, (bool) $request->user()?->can('costs.view'));

        // Esta ruta es de api.php (sin sesión): currentBranchId() cae a la primera
        // sucursal y la relación `stock` no sirve aquí. Quien busca indica la sucursal
        // y se devuelve `branch_stock` = existencias de esa sucursal (null si nunca
        // ha tenido registro en `stocks`).
        $branchId = $request->integer('branch_id') ?: null;
        $user = $request->user();
        // Existencias sólo de una sucursal del usuario, y sólo si puede verlas.
        if ($branchId && (! $user->canAccessBranch($branchId) || ! ($user->can('stock.view') || $user->can('costs.view')))) {
            $branchId = null;
        }
        if ($branchId) {
            $products->select('products.*')->addSelect([
                'branch_stock' => Stock::select('quantity')
                    ->whereColumn('stocks.product_id', 'products.id')
                    ->where('stocks.branch_id', $branchId)
                    ->limit(1),
                // null = nunca se ha contado en esa sucursal ("sin inventario cargado")
                'branch_counted_at' => Stock::select('counted_at')
                    ->whereColumn('stocks.product_id', 'products.id')
                    ->where('stocks.branch_id', $branchId)
                    ->limit(1),
            ]);
        }

        $results = $products->get();

        // Quien no puede ver costos (cajero) no los recibe: ocultarlos sólo en pantalla no basta.
        if (! $request->user()?->can('costs.view')) {
            $results->each->makeHidden(['cost', 'extra', 'iva', 'stock']);
        }

        return response()->json($results);
    }

    /**
     * Existencias de varios productos en una sucursal: { product_id: { quantity, counted } }.
     * La usa la nota al abrirse en edición para avisar si una partida pide más
     * piezas de las disponibles (api.php, sin sesión: la sucursal va explícita).
     */
    public function stockByIds(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer',
            'ids' => 'required|array|max:200',
            'ids.*' => 'integer',
        ]);

        $stocks = Stock::where('branch_id', $validated['branch_id'])
            ->whereIn('product_id', $validated['ids'])
            ->get(['product_id', 'quantity', 'counted_at'])
            ->keyBy('product_id');

        // counted = false: el producto no tiene inventario cargado en esa sucursal y la
        // nota no debe avisar de existencias.
        return response()->json(
            collect($validated['ids'])->mapWithKeys(fn ($id) => [$id => [
                'quantity' => isset($stocks[$id]) ? (float) $stocks[$id]->quantity : null,
                'counted' => isset($stocks[$id]) && $stocks[$id]->counted_at !== null,
            ]])
        );
    }
}
