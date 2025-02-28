<?php

namespace App\Exports;

use App\Models\Corte;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Events\AfterSheet;

class CortesExport implements FromQuery, WithHeadings, WithEvents
{

    public function query()
    {
        return Corte::query()->select('id', 'sale_total', 'cash_total', 'date');
    }

    public function headings(): array
    {
        return ["Folio", "Venta total", "Efectivo", "Fecha"];
    }
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Obtener la última fila con datos
                $lastRow = $sheet->getHighestRow();

                // Agregar una fórmula en la celda C(lastRow + 1) que suma toda la columna C
                $sheet->setCellValue("C" . ($lastRow + 1), "=SUM(C2:C{$lastRow})");

                // Opcional: Poner en negrita la celda con la fórmula
                $sheet->getStyle("C" . ($lastRow + 1))->getFont()->setBold(true);
            },
        ];
    }
}
