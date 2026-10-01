<?php

namespace App\Exports\AdminReport;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/** Reporte del dashboard de administración: una hoja por módulo. */
class AdminReportExport implements WithMultipleSheets
{
    /** @param array $data el mismo arreglo que recibe la página Admin/Dashboard */
    public function __construct(private array $data) {}

    public function sheets(): array
    {
        $d = $this->data;
        $s = $d['sales']['current'];
        $p = $d['sales']['previous'];
        $c = $d['collections']['totals'];
        $r = $d['receivables'];
        $inv = $d['inventory'];

        return [
            new ArraySheet('Resumen', ['Indicador', 'Periodo', 'Periodo anterior'], [
                ['Rango', "{$d['filters']['from']} a {$d['filters']['to']}", implode(' a ', $d['sales']['previous_range'])],
                ['Sucursal', $d['filters']['branch_name'], ''],
                ['Venta', $s['sale'], $p['sale']],
                ['Costo', $s['purchase'], $p['purchase']],
                ['Utilidad', $s['profit'], $p['profit']],
                ['Margen %', $s['margin'], $p['margin']],
                ['Notas', $s['notes_count'], $p['notes_count']],
                ['Ticket promedio', $s['avg_ticket'], $p['avg_ticket']],
                ['Cobrado - efectivo', $c['cash'], ''],
                ['Cobrado - tarjeta', $c['card'], ''],
                ['Cobrado - transferencia', $c['transfer'], ''],
                ['Cobrado - total', $c['total'], ''],
                ['Cuentas por cobrar (hoy)', $r['total'], ''],
                ['Inventario a costo (hoy)', $inv['value_at_cost'], ''],
            ]),
            new ArraySheet('Ventas', ['Fecha', 'Notas', 'Venta', 'Costo', 'Utilidad'], array_map(
                fn ($b) => [$b['key'], $b['notes_count'], $b['sale'], $b['purchase'], $b['profit']],
                $d['salesSeries']
            )),
            new ArraySheet('Sucursales', ['Sucursal', 'Notas', 'Venta', 'Utilidad', 'Margen %'], array_map(
                fn ($b) => [$b['name'], $b['notes_count'], $b['sale'], $b['profit'], $b['margin']],
                $d['salesByBranch']
            )),
            new ArraySheet('Cobranza', ['Fecha', 'Efectivo', 'Tarjeta', 'Transferencia', 'Total'], array_map(
                fn ($b) => [$b['key'], $b['cash'], $b['card'], $b['transfer'], round($b['cash'] + $b['card'] + $b['transfer'], 2)],
                $d['collections']['series']
            )),
            new ArraySheet('Por cobrar', ['Folio', 'Cliente', 'Sucursal', 'Fecha', 'Días', 'Venta', 'Saldo'], array_map(
                fn ($n) => [$n->folio, $n->customer, $n->branch, $n->date, $n->age_days, $n->sale_total, $n->balance],
                $d['receivablesAll']
            )),
            new ArraySheet('Productos', ['Marca', 'Modelo', 'Medida', 'Unidades', 'Venta', 'Utilidad', 'Notas'], array_map(
                fn ($row) => [$row['brand'], $row['model'], $row['measure'], $row['units'], $row['sale'], $row['profit'], $row['notes_count']],
                $d['products']['by_sale']
            )),
            new ArraySheet('Clientes', ['Cliente', 'Notas', 'Venta', 'Saldo'], array_map(
                fn ($row) => [$row['customer'], $row['notes_count'], $row['sale'], $row['balance']],
                $d['customers']
            )),
            new ArraySheet('Stock bajo', ['Marca', 'Modelo', 'Medida', 'Existencia', 'Costo'], array_map(
                fn ($row) => [$row->brand, $row->model, $row->measure, $row->quantity, $row->cost],
                $inv['low_stock']
            )),
        ];
    }
}
