<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Events\AfterSheet;

class ReporteSemanalExport implements FromArray, WithEvents
{
    protected array $data;
    protected int $lastCorteRow = 15;

    public function __construct(array $data)
    {
        $this->data = $data;
    }
    //rows as reference
    private function setTotalValue(string $label, $value, array &$rows, int $rowIndex = 2, int $columnIndex = 1): void

    {
        if (!isset($rows[$rowIndex])) {
            $rows[$rowIndex] = [];
        }
        $rows[$rowIndex][$columnIndex] = $label;
        $rows[$rowIndex][$columnIndex + 1] = $value;
    }

    //create a grid in excel with empty values to prevent errors
    private function createEmptyGrid(int $startRow, int $endRow, int $columns = 3): array
    {
        $rows = [];
        for ($i = $startRow; $i <= $endRow; $i++) {
            if (!isset($rows[$i])) {
                $rows[$i] = array_fill(0, $columns, '');
            }
        }
        return $rows;
    }

    public function array(): array
    {
        $rows = $this->createEmptyGrid(0, 20, 20);

        $data = $this->data;

        // Título en fila 1
        $rows[1][1] = $data['title'] ?? 'Reporte';

        $rows[14][1] = 'CORTES';
        $rows[15] = ['', 'FECHA', 'VENTA', 'RESTA', 'TRANSFERENCIA', 'ENTRADAS', 'GASTOS', 'EFECTIVO', 'MATERIAL'];


        $data['cortes'] = json_decode($data['cortes'], true);

        foreach ($data['cortes'] as $i => $note) {

            $rows[16 + $i] = [
                '',
                $note['date'],
                $note['sale_total'] ?? "0",
                $note['balance_total'] ?? "0",
                $note['transfer_total'] ?? "0",
                $note['previous_notes_total'] ?? "0",
                $note['expenses_total'] ?? "0",
                $note['cash_total'] ?? "0",
                "0",
            ];
            $this->lastCorteRow = 16 + $i + 1;
        }

        $rows[$this->lastCorteRow + 1] = [
            '',
            'TOTAL',
            '=SUM(C16:C' . $this->lastCorteRow . ')',
            '=SUM(D16:D' . $this->lastCorteRow . ')',
            '=SUM(E16:E' . $this->lastCorteRow . ')',
            '=SUM(F16:F' . $this->lastCorteRow . ')',
            '=SUM(G16:G' . $this->lastCorteRow . ')',
            '=SUM(H16:H' . $this->lastCorteRow . ')',
            '=SUM(I16:I' . $this->lastCorteRow . ')',
        ];


        $rows[4][5] = 'GASTOS EXTRA';
        $this->setTotalValue('GASOLINA, CHOFER, CASETAS:',  $data['gasolina'] ?? 0, $rows, 5, 5);
        $this->setTotalValue('LUZ:',  $data['luz'] ?? 0, $rows, 6, 5);
        $this->setTotalValue('RENTA:',  $data['renta'] ?? 0, $rows, 7, 5);
        $this->setTotalValue('TOTAL:',  '=SUM(G6:G8)', $rows, 8, 5);


        $totalRow = $this->lastCorteRow + 1;
        $this->setTotalValue('VENTA TOTAL:',  '=C' . $totalRow, $rows, 3);
        $this->setTotalValue('RESTAN NOTAS:', '=D' . $totalRow, $rows, 4);
        $this->setTotalValue('TRANSFERENCIAS:', '=E' . $totalRow, $rows, 5);
        $this->setTotalValue('ENTRADAS:', '=F' . $totalRow, $rows, 6);
        $this->setTotalValue('GASTOS:', '=G' . $totalRow, $rows, 7);
        $this->setTotalValue('EFECTIVO:', '=H' . $totalRow, $rows, 8);
        $this->setTotalValue('MATERIAL:', '=I' . $totalRow, $rows, 9);
        $this->setTotalValue('SUELDOS:', $data['salary'] ?? 0, $rows, 10);
        $this->setTotalValue('GASTOS EXTRA:', '=G9', $rows, 11);
        $this->setTotalValue('50%:', '=(C4-C11-C12)*0.5', $rows, 12);




        return $rows;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet;


                $sheet->mergeCells('B2:I2');

                $sheet->getStyle('A1:J40')->applyFromArray([
                    'font' => [
                        'size' => 14,
                    ],
                ]);

                $sheet->getStyle('B2')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 18,
                    ],
                    'alignment' => [
                        'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    ],
                ]);

                $sheet->mergeCells('B15:I15');
                $sheet->getStyle('B15')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 16,
                    ],
                    'alignment' => [
                        'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    ],
                ]);

                $sheet->getStyle('F5')->applyFromArray([

                    'font' => [
                        'size' => 14,
                        'bold' => true,
                        'color' => ['rgb' => 'FFFFFF'],
                    ],
                    'fill' => [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'bc98bb'],
                    ],
                ]);


                $columnWidth = 20;
                $sheet->getColumnDimension('B')->setWidth(30);
                $sheet->getColumnDimension('C')->setWidth($columnWidth);
                $sheet->getColumnDimension('D')->setWidth($columnWidth);
                $sheet->getColumnDimension('E')->setWidth($columnWidth);
                $sheet->getColumnDimension('F')->setWidth($columnWidth);
                $sheet->getColumnDimension('G')->setWidth($columnWidth);
                $sheet->getColumnDimension('H')->setWidth($columnWidth);
                $sheet->getColumnDimension('I')->setWidth($columnWidth);

                $currencyFormat = '$#,##0.00';
                $sheet->getStyle("C4:C13")
                    ->getNumberFormat()
                    ->setFormatCode($currencyFormat);

                $sheet->getStyle("G6:G9")
                    ->getNumberFormat()
                    ->setFormatCode($currencyFormat);

                $lastRow = $this->lastCorteRow + 1;
                $sheet->getStyle("B17:I{$lastRow}")
                    ->getNumberFormat()
                    ->setFormatCode($currencyFormat);

                $sheet->getStyle("B17:B{$lastRow}")
                    ->getAlignment()
                    ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("B{$lastRow}")->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 13,
                    ],
                    'alignment' => [
                        'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    ],
                ]);


                $sheet->getStyle('B16:I16')->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => ['rgb' => 'FFFFFF'],
                    ],
                    'fill' => [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '769d65'],
                    ],
                    'alignment' => [
                        'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    ],
                ]);
            },
        ];
    }
}
