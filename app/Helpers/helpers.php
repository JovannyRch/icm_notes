<?php

use App\Models\Branch;

if (! function_exists('format_currency')) {
    /**
     * Formatea un número como moneda con el símbolo de peso y dos decimales.
     *
     * @param  float  $amount
     * @return string
     */
    function format_currency($amount)
    {
        if (! is_numeric($amount)) {
            return '-';
        }

        return '$'.number_format($amount, 2, '.', ',');
    }

    function currentBranchId(): ?int
    {
        $branchId = session('branch_id');
        $user = auth()->user();

        // Con usuario: la sucursal de la sesión tiene que ser una de las suyas (un cajero
        // sólo trabaja en las asignadas). Si no, se usa la primera permitida.
        if ($user) {
            $allowed = $user->accessibleBranchIds();
            if (! $branchId || ! in_array((int) $branchId, $allowed, true)) {
                $branchId = $allowed[0] ?? null;
                session(['branch_id' => $branchId]);
            }

            return $branchId ? (int) $branchId : null;
        }

        if (! $branchId) {
            $firstBranch = Branch::select('id')->orderBy('id', 'asc')->first();

            if ($firstBranch) {
                session(['branch_id' => $firstBranch->id]);
                $branchId = $firstBranch->id;
            }
        }

        return $branchId;
    }
}

if (! function_exists('businessToday')) {
    /** Fecha de hoy (Y-m-d) en la zona horaria del negocio, no la del servidor. */
    function businessToday(): string
    {
        return now(config('app.business_timezone'))->toDateString();
    }
}
