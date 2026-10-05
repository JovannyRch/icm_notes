<?php

namespace Tests\Feature;

use App\Exports\ReporteSemanalExport;
use Tests\TestCase;

/** Excel del corte semanal: tarjeta junto a transferencias y la fórmula del 50% con sus filas. */
class WeeklyReportExportTest extends TestCase
{
    public function test_card_column_and_summary_are_included(): void
    {
        $cortes = [
            ['date' => 'LUNES', 'sale_total' => 1000, 'balance_total' => 100, 'card_total' => 300, 'transfer_total' => 200, 'previous_notes_total' => 0, 'expenses_total' => 50, 'cash_total' => 350, 'material_total' => 400],
            ['date' => 'MARTES', 'sale_total' => 500, 'balance_total' => 0, 'card_total' => 150, 'transfer_total' => 0, 'previous_notes_total' => 0, 'expenses_total' => 0, 'cash_total' => 350, 'material_total' => 200],
        ];
        $rows = (new ReporteSemanalExport(['title' => 'SEMANA', 'cortes' => json_encode($cortes), 'salary' => 4800]))->array();

        $this->assertSame(['', 'FECHA', 'VENTA', 'RESTA', 'TARJETA', 'TRANSFERENCIA', 'ENTRADAS', 'GASTOS', 'EFECTIVO', 'MATERIAL'], $rows[15]);
        $this->assertSame('300', $rows[16][4]);
        $this->assertSame('200', $rows[16][5]);
        $this->assertSame('400', $rows[16][9]);

        // Fila de totales (Excel 19) y el resumen de arriba apuntando a la columna correcta.
        $this->assertSame('=SUM(E16:E18)', $rows[18][4]);
        $this->assertSame('=SUM(J16:J18)', $rows[18][9]);
        $this->assertSame(['TARJETAS:', '=E19'], [$rows[5][1], $rows[5][2]]);
        $this->assertSame(['TRANSFERENCIAS:', '=F19'], [$rows[6][1], $rows[6][2]]);
        $this->assertSame(['MATERIAL:', '=J19'], [$rows[10][1], $rows[10][2]]);
        $this->assertSame(['SUELDOS:', 4800], [$rows[11][1], $rows[11][2]]);
        $this->assertSame(['GASTOS EXTRA:', '=G9'], [$rows[12][1], $rows[12][2]]);
        // 50% = (venta C4 − material C11 − sueldos C12 − gastos extra C13) / 2
        $this->assertSame(['50%:', '=(C4-C11-C12-C13)*0.5'], [$rows[13][1], $rows[13][2]]);
        $this->assertSame('CORTES', $rows[14][1], 'el resumen no pisa el título de la tabla');
    }
}
