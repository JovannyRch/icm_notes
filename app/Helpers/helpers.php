<?php

use App\Models\Branch;
use Illuminate\Support\Facades\Log;

if (!function_exists('format_currency')) {
    /**
     * Formatea un número como moneda con el símbolo de peso y dos decimales.
     *
     * @param float $amount
     * @return string
     */
    function format_currency($amount)
    {
        if (!is_numeric($amount)) {
            return "-";
        }

        return '$' . number_format($amount, 2, '.', ',');
    }

    function currentBranchId(): ?int
    {
        $branchId = session('branch_id');

        if (!$branchId) {
            $firstBranch = Branch::select('id')->orderBy('id', 'asc')->first();

            if ($firstBranch) {
                session(['branch_id' => $firstBranch->id]);
                $branchId = $firstBranch->id;
            }
        }

        return $branchId;
    }
}
