<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Stock;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
            $products = $this->getSearchQuery($query, $brand);
            $products->appends(request()->query());
            return Inertia::render(
                'Products/Index',
                [
                    'pagination' => $products->paginate(50),
                    'brands' => $brands,
                ]
            );
        }

        $pagination  = null;

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
            $stockService = new StockService();
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
            'stockMovements' => $stockMovements
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
            $stockService = new StockService();

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

    public function getSearchQuery($query, $brand = null)
    {

        $isPostgreSQL = DB::connection()->getDriverName() === 'pgsql';

        $likeOperator = $isPostgreSQL ? 'ILIKE' : 'LIKE';

        $keywords = explode(' ', $query);

        $products = Product::query();

        foreach ($keywords as $keyword) {
            $products->where(function ($q) use ($keyword, $likeOperator) {
                $q->orWhere('model', $likeOperator, "%{$keyword}%")
                    ->orWhere('measure', $likeOperator, "%{$keyword}%")
                    ->orWhere('mc', $likeOperator, "%{$keyword}%")
                    ->orWhere('unit', $likeOperator, "%{$keyword}%")
                    ->orWhere('price', $likeOperator, "%{$keyword}%")
                    ->orWhere('cost', $likeOperator, "%{$keyword}%")
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

        $products = $this->getSearchQuery($query);

        return response()->json($products->get());
    }
}
