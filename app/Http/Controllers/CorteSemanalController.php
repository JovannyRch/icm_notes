<?php

namespace App\Http\Controllers;

use App\Exports\ReporteSemanalExport;
use App\Models\Branch;
use App\Models\Corte;
use App\Models\CorteSemanal;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Str;

class CorteSemanalController extends Controller
{

    //index
    public function index(Branch $branch)
    {
        $pagination = CorteSemanal::where('branch_id', $branch->id)->orderBy('date', 'desc')->paginate(20);

        return Inertia::render('CortesSemanales/Index', [
            'pagination' => $pagination,
            'branch' => $branch
        ]);
    }

    public function create(Request $request, Branch $branch)
    {
        $start = $request->input('start_date', now()->startOfWeek()->format('Y-m-d'));
        $end = $request->input('end_date', now()->endOfWeek()->format('Y-m-d'));

        $start = Carbon::parse($start)->startOfDay()->toDateString();
        $end = Carbon::parse($end)->endOfDay()->toDateString();

        $date_range = [
            'start' => $start,
            'end' => $end,
        ];


        $cortes = Corte::where('branch_id', $branch->id)
            ->whereBetween('date', [$date_range['start'], $date_range['end']])
            ->orderBy('date', 'asc')
            ->get();

        return Inertia::render('CortesSemanales/Form', [
            'cortes' => $cortes,
            'branch' => $branch,
            'date_range' => $date_range,
            'initial_start' => $start,
            'initial_end' => $end,
        ]);
    }

    public function show(CorteSemanal $corte)
    {

        $date = $corte->date;
        $branch = Branch::find($corte->branch_id);

        return Inertia::render('CortesSemanales/Form', [
            'corte' => $corte,
            'date' => $date,
            'branch' => $branch
        ]);
    }

    public function destroy(CorteSemanal $corte)
    {
        if ($corte) {
            $corte->delete();
            return response()->json(['message' => 'Corte deleted successfully'], 200);
        } else {
            return response()->json(['message' => 'Corte not found'], 404);
        }
    }

    public function exportCorteSemanal(Request $request)
    {
        $filename = 'reporte_' . Str::uuid() . '.xlsx';
        $path = 'temp_reports/' . $filename;

        Excel::store(new ReporteSemanalExport($request->all()), $path, 'public');

        return response()->json([
            'url' => Storage::url($path),
        ]);
    }
}
