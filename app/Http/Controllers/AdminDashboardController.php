<?php

namespace App\Http\Controllers;

use App\Exports\AdminReport\AdminReportExport;
use App\Models\Branch;
use App\Services\AnalyticsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Dashboard de analíticas, sólo para BILLING_ADMIN_EMAILS (404 para los demás).
 */
class AdminDashboardController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAdmin();

        return Inertia::render('Admin/Dashboard', $this->buildData($request, limit: 10));
    }

    public function export(Request $request)
    {
        $this->authorizeAdmin();

        $data = $this->buildData($request, limit: 200);
        $f = $data['filters'];

        return Excel::download(new AdminReportExport($data), "REPORTE_{$f['from']}_{$f['to']}.xlsx");
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
        $from = isset($validated['from']) ? CarbonImmutable::parse($validated['from'], $tz) : $today->startOfMonth();
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
            'customers' => $analytics->topCustomers($limit),
            'inventory' => $analytics->inventory($limit),
        ];
    }

    private function authorizeAdmin(): void
    {
        abort_unless(Gate::allows('admin'), 404);
    }
}
