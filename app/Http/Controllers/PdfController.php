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
        $branch = $corte->branch;

        $branch_name = $this->formatBranchName($branch->name);

        $data = [
            'corte' => $corte,
            'branch_name' => $branch_name,
        ];

        $pdf = Pdf::loadView('pdf.corte', $data);


        return $pdf->download("CORTE_{$branch_name}_{$corte->date}.pdf");
    }
}
