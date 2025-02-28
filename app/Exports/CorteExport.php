<?php

namespace App\Exports;

use App\Models\Corte;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Events\AfterSheet;

class CorteExport implements WithHeadings, WithMapping, WithEvents
{
    protected Corte $corte;

    public function __construct($corte)
    {
        $this->corte = $corte;
    }

    public function headings(): array
    {
        return ["Concepto", "Cantidad"];
    }

    public function map($row): array
    {
        return [
            ['Gastos', $this->corte->expenses->sum('amount')],
            ['Devoluciones', $this->corte->returns->sum('amount')],
            /*   ['Notas', count($this->corte->notas)], */
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();
                $sheet->setCellValue("B" . ($lastRow + 1), "=SUM(B2:B{$lastRow})");
                $sheet->getStyle("B" . ($lastRow + 1))->getFont()->setBold(true);
            },
        ];
    }
}
