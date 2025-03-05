<?php

function getBalance($corte)
{
    $sum = 0;

    foreach ($corte->notes as $note) {
        if (is_numeric($note['balance'])) {
            $sum += $note['balance'];
        }
    }

    return format_currency($sum, 2);
}

function getReturns($corte)
{
    $sum = 0;

    foreach ($corte->returns as $r) {
        if (is_numeric($r['amount'])) {
            $sum += $r['amount'];
        }
    }

    return format_currency($sum, 2);
}

function getExpenses($corte)
{
    $sum = 0;

    foreach ($corte->expenses as $e) {
        if (is_numeric($e['amount'])) {
            $sum += $e['amount'];
        }
    }

    return format_currency($sum, 2);
}

function getPaymentMethods($note): string
{
    $result = [];

    if ($note['cash'] > 0) {
        $result[] = 'Efect (' . format_currency($note['cash']) . ')';
    }
    if ($note['card'] > 0) {
        $result[] = 'Tarj (' . format_currency($note['card']) . ')';
    }
    if ($note['transfer'] > 0) {
        $result[] = 'Trans (' . format_currency($note['transfer']) . ')';
    }

    return implode(', ', $result);
}

?>

<!DOCTYPE html>
<html>

<head>
    <title>CORTE_{{ $branch_name }}_{{ $corte->date }}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            /* Fuente tipo ticket */
            font-size: 16px;

            margin: 0 auto;
            /* Centrar el ticket */
            padding: 10px;
            border: 1px dashed #ccc;
            /* Borde para simular el ticket */
        }

        /* Encabezado del ticket */
        .ticket-header {
            text-align: center;
            margin-bottom: 10px;
        }

        .ticket-header h1 {
            font-size: 16px;
            margin: 0;
        }

        .ticket-header p {
            margin: 5px 0;
            font-size: 13px;
        }

        /* Tabla de productos */
        .ticket-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 12px;
        }

        .ticket-table th,
        .ticket-table td {
            padding: 5px;
            text-align: left;
            border-bottom: 1px dashed #ccc;
            /* Líneas punteadas para simular el ticket */
        }

        .ticket-table th {
            font-weight: bold;
        }

        /* Totales */
        .ticket-totals {
            text-align: left;
            margin-top: 10px;
        }

        .ticket-totals p {
            margin: 5px 0;
        }

        /* Pie del ticket */
        .ticket-footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            border-top: 1px dashed #ccc;
            /* Línea punteada para separar el pie */
            padding-top: 10px;
        }

        .table-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
        }

        .divider {
            margin-top: 10px;
            margin-bottom: 10px;
            border-top: 1px dashed #ccc;
        }
    </style>
</head>

<body>




    <div class="ticket-header">
        <p>CORTE #{{ $corte->id }}</p>
        <p>Sucursal: {{ $corte->branch->name }}</p>
        <p>Fecha: {{ $corte->date }}</p>
    </div>




    <div class="ticket-totals">
        <p>Venta total: {{ format_currency($corte->sale_total, 2) }}</p>
        <p><strong>Efectivo: {{ format_currency($corte->cash_total, 2) }}</strong></p>
        <p>Transferencia: {{ format_currency($corte->transfer_total, 2) }}</p>
        <p>Tarjeta: {{ format_currency($corte->card_total, 2) }}</p>
        <p>Entradas: {{ format_currency($corte->previous_notes_total, 2) }}</p>
        <p>Restan notas: {{ getBalance($corte) }}</p>
        <p>Gastos: {{ getExpenses($corte) }}</p>
        <p>Devoluciones: {{ getReturns($corte) }}</p>
    </div>
    <br>

    <div class="divider"></div>
    <br>

    <div class="table-title">VENTA CON NOTAS DE PEDIDO</div>
    <br>
    <table class="ticket-table">
        <thead>
            <tr>
                <th>No NOTA</th>
                <th>FECHA</th>
                <th>A CTA</th>
                <th>RESTA</th>
                <th>TOTAL</th>
                <th>MÉTODO DE PAGO</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($corte->notes as $note)
                <tr>
                    <td>{{ $note['folio'] }}</td>
                    <td>{{ $note['date'] }}</td>
                    <td>{{ format_currency($note['advance'], 2) }}</td>
                    <td>{{ format_currency($note['balance'], 2) }}</td>
                    <td>{{ format_currency($note['sale_total'], 2) }}</td>
                    <td>
                        {{ getPaymentMethods($note) }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if (count($corte->previous_notes) > 0)
        <br>
        <br>


        <div class="table-title">ENTRADAS ANTERIORES</div>
        <br>
        <table class="ticket-table">
            <thead>
                <tr>
                    <th>No NOTA</th>
                    <th>FECHA</th>
                    <th>EFECTIVO</th>
                    <th>TRANSFERENCIA</th>
                    <th>TARJETA</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($corte->previous_notes as $note)
                    <tr>
                        <td>{{ $note['folio'] }}</td>
                        <td>{{ $note['date'] }}</td>
                        <td>{{ format_currency($note['cash'], 2) }}</td>
                        <td>{{ format_currency($note['card'], 2) }}</td>
                        <td>{{ format_currency($note['transfer'], 2) }}</td>

                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if (count($corte->returns) > 0)
        <br>
        <br>

        <div class="table-title">DEVOLUCIONES</div>
        <br>
        <table class="ticket-table">
            <thead>
                <tr>
                    <th>CONCEPTO</th>
                    <th>CANTIDAD</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($corte->returns as $note)
                    <tr>
                        <td>{{ $note['concept'] }}</td>
                        <td>{{ format_currency($note['amount'], 2) }}</td>

                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if (count($corte->expenses) > 0)
        <br>
        <br>

        <div class="table-title">GASTOS</div>
        <br>
        <table class="ticket-table">
            <thead>
                <tr>
                    <th>CONCEPTO</th>
                    <th>CANTIDAD</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($corte->expenses as $note)
                    <tr>
                        <td>{{ $note['concept'] }}</td>
                        <td>{{ format_currency($note['amount'], 2) }}</td>

                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

</body>

</html>
