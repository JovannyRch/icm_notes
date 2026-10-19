<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 10px; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h1 { font-size: 16px; margin: 0 0 4px; }
        .header p { margin: 2px 0; font-size: 12px; }
        .table-title { font-size: 14px; font-weight: bold; text-align: center; margin: 12px 0 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 6px; border-bottom: 1px dashed #ccc; }
        th { text-align: right; font-weight: bold; }
        td.num, th.num { text-align: right; }
        th.left, td.left { text-align: left; }
        tr.total td { font-weight: bold; border-top: 1px solid #000; border-bottom: none; }
        .summary td { border: none; padding: 2px 6px; }
        .summary td.num { width: 130px; }
        .negative { color: #d03b3b; }
    </style>
</head>

@php
    $result = ($totals['sale'] - $salary - $totals['material'] - $extra) * ($split ? 0.5 : 1);
    $cols = [
        'sale_total' => 'Venta', 'balance_total' => 'Resta', 'card_total' => 'Tarjeta',
        'transfer_total' => 'Transf.', 'previous_notes_total' => 'Entradas', 'expenses_total' => 'Gastos',
        'cash_total' => 'Efectivo', 'material_total' => 'Material',
    ];
@endphp

<body>
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>Sucursal: {{ $branch->name }}</p>
    </div>

    <div class="table-title">CORTES</div>
    <table>
        <thead>
            <tr>
                <th class="left">Fecha</th>
                @foreach ($cols as $label)
                    <th class="num">{{ $label }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($cortes as $corte)
                <tr>
                    <td class="left">{{ $corte['date'] ?? '' }}</td>
                    @foreach ($cols as $key => $label)
                        <td class="num">{{ format_currency($corte[$key] ?? 0) }}</td>
                    @endforeach
                </tr>
            @endforeach
            <tr class="total">
                <td class="left">TOTAL</td>
                <td class="num">{{ format_currency($totals['sale']) }}</td>
                <td class="num">{{ format_currency($totals['balance']) }}</td>
                <td class="num">{{ format_currency($totals['card']) }}</td>
                <td class="num">{{ format_currency($totals['transfer']) }}</td>
                <td class="num">{{ format_currency($totals['previous']) }}</td>
                <td class="num">{{ format_currency($totals['expenses']) }}</td>
                <td class="num">{{ format_currency($totals['cash']) }}</td>
                <td class="num">{{ format_currency($totals['material']) }}</td>
            </tr>
        </tbody>
    </table>

    <table style="margin-top: 16px;">
        <tr>
            <td style="width: 50%; vertical-align: top; border: none;">
                <div class="table-title" style="text-align: left;">GASTOS EXTRA</div>
                <table class="summary">
                    <tr><td>Gasolina, chofer, casetas:</td><td class="num">{{ format_currency($gasolina) }}</td></tr>
                    <tr><td>Luz:</td><td class="num">{{ format_currency($luz) }}</td></tr>
                    <tr><td>Renta:</td><td class="num">{{ format_currency($renta) }}</td></tr>
                    <tr class="total"><td>Total:</td><td class="num">{{ format_currency($gasolina + $luz + $renta) }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; vertical-align: top; border: none;">
                <div class="table-title" style="text-align: left;">{{ $split ? 'CÁLCULO DEL 50%' : 'CÁLCULO DE LA UTILIDAD' }}</div>
                <table class="summary">
                    <tr><td>Venta total:</td><td class="num">{{ format_currency($totals['sale']) }}</td></tr>
                    <tr><td>− Material:</td><td class="num">{{ format_currency($totals['material']) }}</td></tr>
                    <tr><td>− Sueldos:</td><td class="num">{{ format_currency($salary) }}</td></tr>
                            <tr><td>− Gastos extra:</td><td class="num">{{ format_currency($extra) }}</td></tr>
                            <tr class="total"><td>{{ $split ? '50%:' : 'Utilidad:' }}</td><td class="num {{ $result < 0 ? 'negative' : '' }}">{{ format_currency($result) }}</td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
