<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Services\UsageService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Uso del sistema (sólo super admin): adopción de la caja y de sus funciones. */
class UsageController extends Controller
{
    public const PERIODS = [7, 30, 90];

    public function index(Request $request)
    {
        $days = in_array((int) $request->input('dias'), self::PERIODS, true) ? (int) $request->input('dias') : 30;
        $branchId = Branch::whereKey((int) $request->input('sucursal'))->value('id');

        return Inertia::render('Usage/Index', (new UsageService($days, $branchId))->build() + [
            'filters' => ['dias' => $days, 'sucursal' => $branchId],
            'allBranches' => Branch::orderBy('id')->get(['id', 'name']),
        ]);
    }
}
