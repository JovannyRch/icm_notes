<?php

namespace App\Http\Controllers;

use App\Models\Corte;
use Barryvdh\DomPDF\Facade\Pdf;

class PdfController extends Controller
{
    public function formatBranchName($name)
    {
        $uppercase = strtoupper($name);

        return str_replace(' ', '_', $uppercase);
    }

    public function exportCorte(Corte $corte)
    {
        abort_unless(request()->user()->canAccessBranch((int) $corte->branch_id), 403, 'No tienes acceso a esa sucursal.');
        $branch = $corte->branch;

        $branch_name = $this->formatBranchName($branch->name);

        $data = [
            'corte' => $corte,
            'branch_name' => $branch_name,
            // El cajero descarga el corte sin las compras.
            'hideCosts' => ! request()->user()->can('costs.view'),
        ];

        $pdf = Pdf::loadView('pdf.corte', $data);

        return $pdf->download("CORTE_{$branch_name}_{$corte->date}.pdf");
    }
}
