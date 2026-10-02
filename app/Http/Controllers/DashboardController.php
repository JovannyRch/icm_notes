<?php

namespace App\Http\Controllers;

use App\Exports\Dashboard\DashboardExport;
use App\Models\Branch;
use App\Services\AnalyticsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Dashboard de analíticas: pantalla inicial después del login, para todos los usuarios.
 */
class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Pantalla inicial después del login: quien no tiene dashboard (cajero) va a la caja.
        if (! $request->user()->can('dashboard.view')) {
            return redirect()->route($request->user()->can('sales.create') ? 'caja' : 'profile.edit');
        }

        return Inertia::render('Dashboard', $this->buildData($request, limit: 10));
    }

    public function export(Request $request)
    {
        $data = $this->buildData($request, limit: 200);
        $f = $data['filters'];

        return Excel::download(new DashboardExport($data), "REPORTE_{$f['from']}_{$f['to']}.xlsx");
    }

    private function buildData(Request $request, int $limit): array
    {
        $validated = $request->validate([
            'from' => 'nullable|date_format:Y-m-d',
            'to' => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'branch' => 'nullable|integer|exists:branches,id',
        ]);

        $tz = config('billing.timezone');
        $today = CarbonImmutable::now($tz)->startOfDay();
        // Por defecto los últimos 30 días: "este mes" sale vacío los primeros días de cada mes.
        $from = isset($validated['from']) ? CarbonImmutable::parse($validated['from'], $tz) : $today->subDays(29);
        $to = isset($validated['to']) ? CarbonImmutable::parse($validated['to'], $tz) : $today;

        if ($from->diffInDays($to) > 366 * 3) {
            $from = $to->subYears(3);
        }

        $branchId = isset($validated['branch']) ? (int) $validated['branch'] : null;
        $analytics = new AnalyticsService($from, $to, $branchId, $today);
        $receivables = $analytics->receivables($limit);

        return [
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'branch' => $branchId,
                'branch_name' => $branchId ? Branch::find($branchId)->name : 'Todas',
                'granularity' => $analytics->granularity(),
                'today' => $today->toDateString(),
            ],
            'sales' => $analytics->salesSummary(),
            'salesSeries' => $analytics->salesSeries(),
            'salesByBranch' => $analytics->salesByBranch(),
            'collections' => $analytics->collections(),
            'receivables' => [...$receivables, 'oldest' => array_slice($receivables['oldest'], 0, 10)],
            'receivablesAll' => $receivables['oldest'],
            'products' => $analytics->topProducts($limit),
            'inventory' => $analytics->inventory($limit),
        ];
    }
}
