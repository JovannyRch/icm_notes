@php
    $s = $t['settings'];
    $money = fn ($v) => '$' . number_format((float) $v, 2);
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ticket {{ $t['folio'] }}</title>
    <style>
        /* Epson TM-T20IV, papel de 80 mm: el área imprimible es de ~72 mm (576 puntos). */
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body {
            width: 72mm; margin: 0 auto; padding: 3mm 1mm 6mm;
            font: 12px/1.3 "Helvetica Neue", Helvetica, Arial, sans-serif;
            color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact;
            font-variant-numeric: tabular-nums;
        }
        @media screen {
            html { background: #e9e9ea; }
            body { margin: 16px auto; padding: 5mm 3mm 8mm; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
            .screen-bar { display: flex; }
        }
        @media print { .screen-bar { display: none !important; } }
        .screen-bar { display: none; gap: 8px; justify-content: center; margin: 16px auto 0; font: 13px system-ui, sans-serif; }
        .screen-bar button { padding: 8px 14px; border-radius: 8px; border: 1px solid #c8c8cc; background: #fff; cursor: pointer; font: inherit; }
        .screen-bar button.primary { background: #1e40af; color: #fff; border-color: #1e40af; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        .logo { display: block; max-width: 44mm; max-height: 22mm; margin: 0 auto 2mm; filter: grayscale(1) contrast(1.4); }
        .name { font-size: 15px; font-weight: 700; text-transform: uppercase; }
        .muted { font-size: 11px; }
        .rule { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
        .rule-solid { border: 0; border-top: 1.5px solid #000; margin: 2mm 0; }
        .row { display: flex; justify-content: space-between; gap: 2mm; }
        .row > :first-child { min-width: 0; }
        .item { margin: 0 0 1.4mm; }
        .item .desc { font-weight: 600; word-break: break-word; }
        .item .detail { display: flex; justify-content: space-between; font-size: 11.5px; }
        .total { font-size: 18px; font-weight: 800; }
        .banner { border: 2px solid #000; padding: 1mm; margin: 2mm 0; text-align: center; font-weight: 800; font-size: 14px; letter-spacing: 1px; }
        .words { font-size: 10.5px; text-transform: uppercase; margin-top: 1.5mm; }
        .qr { display: flex; justify-content: center; margin: 3mm 0 1mm; }
        .qr svg { width: 26mm; height: 26mm; }
        .pre { white-space: pre-line; }
    </style>
</head>
<body>
    @if ($s['show_logo'])
        <img class="logo" src="{{ asset('img/logo.png') }}" alt="">
    @endif
    <div class="center">
        <div class="name">{{ $s['business_name'] }}</div>
        @if ($s['rfc'])<div class="muted">RFC: {{ $s['rfc'] }}</div>@endif
        @if ($s['address'])<div class="muted pre">{{ $s['address'] }}</div>@endif
        @if ($s['phone'])<div class="muted">Tel. {{ $s['phone'] }}</div>@endif
        @if ($s['header'])<div class="muted pre" style="margin-top:1mm">{{ $s['header'] }}</div>@endif
    </div>

    <hr class="rule">
    <div class="center bold">{{ $t['register'] }}</div>
    <div class="row"><span>Folio: <b>{{ $t['folio'] }}</b></span><span>{{ $t['datetime'] }}</span></div>
    @if ($t['seller'])<div>Atendió: {{ $t['seller'] }}</div>@endif
    <div>Cliente: {{ $t['customer'] ?: 'Público en general' }}</div>

    @if ($sample)<div class="banner">TICKET DE PRUEBA</div>@endif
    @if ($reprint)<div class="banner">REIMPRESIÓN</div>@endif
    @if ($t['canceled'])<div class="banner">VENTA CANCELADA</div>@endif

    <hr class="rule">
    <div class="row bold muted"><span>Cant. · Descripción</span><span>Importe</span></div>
    <hr class="rule">
    @foreach ($t['lines'] as $line)
        <div class="item">
            <div class="desc">{{ $line['description'] }}</div>
            <div class="detail">
                <span>{{ $qty($line['quantity']) }} x {{ $money($line['price']) }}</span>
                <span class="bold">{{ $money($line['amount']) }}</span>
            </div>
            @if ($line['discount'] > 0)
                <div class="detail"><span>Descuento</span><span>-{{ $money($line['discount']) }}</span></div>
            @endif
        </div>
    @endforeach

    <hr class="rule">
    <div class="row"><span>Artículos</span><span>{{ $qty($t['units']) }}</span></div>
    <div class="row"><span>Subtotal</span><span>{{ $money($t['gross']) }}</span></div>
    @if ($t['discount'] > 0)<div class="row"><span>Descuento</span><span>-{{ $money($t['discount']) }}</span></div>@endif
    @if ($t['flete'] > 0)<div class="row"><span>Flete</span><span>{{ $money($t['flete']) }}</span></div>@endif
    <hr class="rule-solid">
    <div class="row total"><span>TOTAL</span><span>{{ $money($t['total']) }}</span></div>
    <div class="words">Son: {{ $t['amount_in_words'] }}</div>

    @unless ($t['canceled'])
        <hr class="rule">
        @if ($t['cash'] > 0)<div class="row"><span>Efectivo</span><span>{{ $money($t['cash']) }}</span></div>@endif
        @if ($t['card'] > 0)<div class="row"><span>Tarjeta</span><span>{{ $money($t['card']) }}</span></div>@endif
        @if ($t['transfer'] > 0)<div class="row"><span>Transferencia</span><span>{{ $money($t['transfer']) }}</span></div>@endif
        @if ($t['cash_received'] !== null)
            <div class="row"><span>Recibido</span><span>{{ $money($t['cash_received']) }}</span></div>
            <div class="row bold"><span>Cambio</span><span>{{ $money($t['change']) }}</span></div>
        @endif
        @if ($t['balance'] > 0.009)
            <div class="row bold"><span>Saldo pendiente</span><span>{{ $money($t['balance']) }}</span></div>
        @endif
    @endunless

    @if ($t['qr'])
        <div class="qr">{!! $t['qr'] !!}</div>
        <div class="center muted">{{ $t['code'] }}</div>
    @endif
    @if ($s['footer'])
        <hr class="rule">
        <div class="center pre">{{ $s['footer'] }}</div>
    @endif

    <div class="screen-bar">
        <button type="button" class="primary" onclick="window.print()">Imprimir</button>
        <button type="button" onclick="window.close()">Cerrar</button>
    </div>

    @if ($printing)
        <script>
            // Se imprime al cargar (incluido el logo). En caja se abre dentro de un iframe oculto.
            window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 50); });
        </script>
    @endif
</body>
</html>
