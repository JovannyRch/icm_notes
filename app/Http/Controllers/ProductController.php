<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Stock;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    public function index(Request $request)
    {

        $query = $request->input('query');
        $brand = $request->input('brand');

        $brands = Product::select('brand')->distinct()->get();

        if ($query) {
            // appends() es del paginador, no del query builder: primero paginar.
            $pagination = $this->getSearchQuery($query, $brand)->paginate(50);
            $pagination->appends(request()->query());

            return Inertia::render(
                'Products/Index',
                [
                    'pagination' => $pagination,
                    'brands' => $brands,
                ]
            );
        }

        $pagination = null;

        if ($brand) {
            $products = Product::where('brand', $brand)->with('stock');
            $pagination = $products->paginate(50);
            $pagination->appends(request()->query());
        } else {
            $pagination = Product::with('stock')->paginate(50);
            $pagination->appends(request()->query());
        }

        return Inertia::render(
            'Products/Index',
            [
                'pagination' => $pagination,
                'brands' => $brands,
            ]
        );
    }

    public function getAll()
    {
        $products = Product::all();

        return response()->json($products);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Products/Form');
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

    public function getSearchQuery($query, $brand = null, bool $matchCost = true)
    {

        $isPostgreSQL = DB::connection()->getDriverName() === 'pgsql';

        $likeOperator = $isPostgreSQL ? 'ILIKE' : 'LIKE';

        $keywords = explode(' ', $query);

        $products = Product::query();

        foreach ($keywords as $keyword) {
            $products->where(function ($q) use ($keyword, $likeOperator, $matchCost) {
                $q->orWhere('model', $likeOperator, "%{$keyword}%")
                    ->orWhere('measure', $likeOperator, "%{$keyword}%")
                    ->orWhere('mc', $likeOperator, "%{$keyword}%")
                    ->orWhere('unit', $likeOperator, "%{$keyword}%")
                    ->orWhere('price', $likeOperator, "%{$keyword}%")
                    // Quien no ve costos tampoco puede deducirlos buscando por número.
                    ->when($matchCost, fn ($q) => $q->orWhere('cost', $likeOperator, "%{$keyword}%"))
                    ->orWhere('brand', $likeOperator, "%{$keyword}%");
            });
        }

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
