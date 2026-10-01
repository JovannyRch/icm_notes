<?php

namespace App\Http\Controllers;

use App\Exports\ProductsExport;
use App\Imports\ProductsImport;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class ProductImportController extends Controller
{
    public function store(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|mimes:xlsx,xls',
            ]);

            $branch = Branch::find(currentBranchId());
            $import = new ProductsImport($branch->id);
            // Todo o nada: si una fila truena, no queda la importación a medias.
            DB::transaction(fn () => Excel::import($import, $request->file('file')));

            $summary = "Importación lista: {$import->created} productos nuevos, {$import->updated} actualizados"
                .", existencias cargadas en {$branch->name}: {$import->stockLoaded}.";

            if ($import->errors) {
                return redirect()->back()
                    ->with('success', $summary)
                    ->with('error', implode(' ', array_slice($import->errors, 0, 5))
                        .(count($import->errors) > 5 ? ' (y '.(count($import->errors) - 5).' más)' : ''));
            }

            return redirect()->back()->with('success', $summary);
        } catch (\Throwable $th) {
            return redirect()->back()->with('error', "Error al importar productos: {$th->getMessage()}");
        }
    }

    public function export(Request $request)
    {
        $brand = $request->input('brand');
        $currentDate = date('d-m-Y');

        if ($brand) {
            return Excel::download(new ProductsExport($brand, currentBranchId()), "CATALAGO_DE_PRODUCTOS_{$brand}_{$currentDate}.xlsx");
        }

        return Excel::download(new ProductsExport(null, currentBranchId()), "CATALAGO_DE_PRODUCTOS_{$currentDate}.xlsx");
    }
}
