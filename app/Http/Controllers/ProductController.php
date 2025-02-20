<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
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

    public function index()
    {
        $pagination = Product::paginate(15);
        return Inertia::render(
            'Products/Index',
            ['pagination' => $pagination]
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

        return redirect()->route('products.show', $product->id)->with('success', 'Producto registrado correctamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        return Inertia::render('Products/Form', [
            'product' => $product
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

    public function search(Request $request)
    {
        $query = $request->input('query');

        if (strlen($query) < 3) {
            return response()->json([]);
        }

        $products = Product::where('model', 'ILIKE', "%{$query}%")
            ->orWhere('code', 'ILIKE', "%{$query}%")
            ->orWhere('measure', 'ILIKE', "%{$query}%")
            ->orWhere('mc', 'ILIKE', "%{$query}%")
            ->orWhere('unit', 'ILIKE', "%{$query}%")
            ->orWhere('model', 'ILIKE', "%{$query}%")
            ->orWhere('brand', 'ILIKE', "%{$query}%")
            ->orWhere('price', 'ILIKE', "%{$query}%")
            ->orWhere('cost', 'ILIKE', "%{$query}%")
            ->limit(20)
            ->get();

        return response()->json($products);
    }
}
