<?php

namespace App\Http\Controllers;

use App\Exports\ProductsExport;
use App\Imports\ProductsImport;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ProductImportController extends Controller
{

    public function store(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|mimes:xlsx,xls',
            ]);

            Excel::import(new ProductsImport, $request->file('file'));

            return redirect()->back()->with('success', 'Productos importados correctamente');
        } catch (\Throwable $th) {
            return redirect()->back()->with('error', "Error al importar productos: {$th->getMessage()}");
        }
    }

    public function export(Request $request)
    {
        $brand = $request->input('brand');
        $currentDate = date('d-m-Y');


        if ($brand) {
            return Excel::download(new ProductsExport($brand), "CATALAGO_DE_PRODUCTOS_{$brand}_{$currentDate}.xlsx");
        }

        return Excel::download(new ProductsExport, "CATALAGO_DE_PRODUCTOS_{$currentDate}.xlsx");
    }
}
