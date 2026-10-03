@php
    $s = $t['settings'];
    $money = fn ($v) => '$' . number_format((float) $v, 2);
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
    $pdf = $pdf ?? false;
    // Copias sólo al imprimir: la 2.ª sale marcada "COPIA" en su propia hoja (corte).
    $copies = $printing && ! $pdf ? max(1, min(2, (int) $s['copies'])) : 1;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ticket {{ $t['folio'] }}</title>
    <style>
        /* Epson TM-T20IV, papel de 80 mm: el área imprimible es de ~72 mm (576 puntos).
           Sin flexbox: el PDF lo genera dompdf, que sólo entiende tablas (display: table). */
        @if ($pdf)
        @page { margin: 0; }
        @else
        @page { size: 80mm auto; margin: 0; }
        @endif
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body {
            width: 72mm; margin: 0 auto; padding: 3mm 1mm 6mm;
            font: 12px/1.3 "Helvetica Neue", Helvetica, Arial, sans-serif;
            color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact;
            font-variant-numeric: tabular-nums;
        }
        @if ($pdf)
        body { width: auto; margin: 0; padding: 3mm 4mm 2mm; }
        @endif
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
        .logo-wrap { text-align: center; margin: 0 0 2mm; }
        .logo { display: inline-block; width: 38mm; height: auto; image-rendering: pixelated; }
        .name { font-size: 15px; font-weight: 700; text-transform: uppercase; }
        .muted { font-size: 11px; }
        .rule { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
        .rule-solid { border: 0; border-top: 1.5px solid #000; margin: 2mm 0; }
        .row { display: table; width: 100%; }
        .row > span { display: table-cell; vertical-align: top; }
        .row > span:last-child { text-align: right; white-space: nowrap; padding-left: 2mm; }
        .item { margin: 0 0 1.4mm; }
        .item .desc { font-weight: 600; word-break: break-word; }
        .item .detail { display: table; width: 100%; font-size: 11.5px; }
        .item .detail > span { display: table-cell; }
        .item .detail > span:last-child { text-align: right; white-space: nowrap; }
        .total { font-size: 18px; font-weight: 800; }
        .banner { border: 2px solid #000; padding: 1mm; margin: 2mm 0; text-align: center; font-weight: 800; font-size: 14px; letter-spacing: 1px; }
        .words { font-size: 10.5px; text-transform: uppercase; margin-top: 1.5mm; }
        .qr { text-align: center; margin: 3mm 0 1mm; }
        .qr img { width: 26mm; height: 26mm; }
        .pre { white-space: pre-line; }
        .farewell { font-size: 13px; font-weight: 700; margin-top: 2mm; }
    </style>
</head>
<body>
@foreach (range(1, $copies) as $copy)
    @if ($copy > 1)<div style="page-break-before: always; break-before: page;"></div>@endif
    @if ($s['show_logo'])
        {{-- Versión en negro puro para papel térmico (public/img/ticket-logo.png). --}}
        <div class="logo-wrap"><img class="logo" src="{{ $pdf ? 'data:image/png;base64,'.base64_encode(file_get_contents(public_path('img/ticket-logo.png'))) : asset('img/ticket-logo.png') }}" alt=""></div>
    @endif
    <div class="center">
        @if ($s['show_business_name'])<div class="name">{{ $s['business_name'] }}</div>@endif
        @if ($s['rfc'])<div class="muted">RFC: {{ $s['rfc'] }}</div>@endif
        @if ($s['address'])<div class="muted pre">{{ $s['address'] }}</div>@endif
        @if ($s['phone'])<div class="muted">Tel. {{ $s['phone'] }}</div>@endif
        @if ($s['header'])<div class="muted pre" style="margin-top:1mm">{{ $s['header'] }}</div>@endif
    </div>

    <hr class="rule">
    @if ($s['show_register'] && $t['register'])<div class="center bold">{{ $t['register'] }}</div>@endif
    <div class="row"><span>Folio: <b>{{ $t['folio'] }}</b></span><span>{{ $t['datetime'] }}</span></div>
    @if ($t['seller'])<div>Atendió: {{ $t['seller'] }}</div>@endif
    @if ($s['show_customer'])
        <div>Cliente: {{ $t['customer'] ?: 'Público en general' }}</div>
        @if ($t['customer_phone'])<div>Tel.: {{ $t['customer_phone'] }}</div>@endif
        @if ($t['customer_address'])<div>Dirección: {{ $t['customer_address'] }}</div>@endif
    @endif

    @if ($copy > 1)<div class="banner">COPIA</div>@endif
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
            @if ($s['show_m2'] && $line['m2'])
                <div class="detail"><span>{{ $qty($line['m2_per_box']) }} m²/caja</span><span>{{ $qty($line['m2']) }} m²</span></div>
            @endif
            @if ($line['discount'] > 0)
                <div class="detail"><span>Descuento</span><span>-{{ $money($line['discount']) }}</span></div>
            @endif
        </div>
    @endforeach

    <hr class="rule">
    @if ($s['show_m2'] && $t['m2'] > 0)<div class="row"><span>Total m²</span><span>{{ $qty($t['m2']) }} m²</span></div>@endif
    <div class="row"><span>Subtotal</span><span>{{ $money($t['gross']) }}</span></div>
    @if ($t['discount'] > 0)<div class="row"><span>Descuento</span><span>-{{ $money($t['discount']) }}</span></div>@endif
    @if ($t['flete'] > 0)<div class="row"><span>Flete</span><span>{{ $money($t['flete']) }}</span></div>@endif
    <hr class="rule-solid">
    <div class="row total"><span>TOTAL</span><span>{{ $money($t['total']) }}</span></div>
    @if ($s['show_amount_in_words'])<div class="words">{{ $t['amount_in_words'] }}</div>@endif

    @unless ($t['canceled'])
        <hr class="rule">
        @if ($s['show_payment'])
        @if ($t['cash'] > 0)<div class="row"><span>Efectivo</span><span>{{ $money($t['cash']) }}</span></div>@endif
        @if ($t['card'] > 0)<div class="row"><span>Tarjeta</span><span>{{ $money($t['card']) }}</span></div>@endif
        @if ($t['transfer'] > 0)<div class="row"><span>Transferencia</span><span>{{ $money($t['transfer']) }}</span></div>@endif
        @if ($t['cash_received'] !== null)
            <div class="row"><span>Recibido</span><span>{{ $money($t['cash_received']) }}</span></div>
            <div class="row bold"><span>Cambio</span><span>{{ $money($t['change']) }}</span></div>
        @endif
        @if ($t['balance'] > 0.009 && $t['cash'] + $t['card'] + $t['transfer'] > 0.009)
            <div class="row"><span>Abonado</span><span>{{ $money($t['cash'] + $t['card'] + $t['transfer']) }}</span></div>
        @endif
        @endif
        {{-- El saldo pendiente se imprime siempre: es lo que el cliente debe. --}}
        @if ($t['balance'] > 0.009)
            <div class="row bold"><span>Saldo pendiente</span><span>{{ $money($t['balance']) }}</span></div>
        @endif
    @endunless

    @if ($s['show_qr'] && $t['qr'])
        <div class="qr"><img src="{{ $t['qr'] }}" alt="QR {{ $t['code'] }}"></div>
        <div class="center muted">{{ $t['code'] }}</div>
    @endif
    @if ($s['footer'] || ($s['show_farewell'] && $s['farewell']))
        <hr class="rule">
    @endif
    @if ($s['footer'])
        {{-- Términos y condiciones: letra chica para no gastar papel. --}}
        <div class="center pre muted">{{ $s['footer'] }}</div>
    @endif
    @if ($s['show_farewell'] && $s['farewell'])
        <div class="center pre farewell">{{ $s['farewell'] }}</div>
    @endif

@endforeach

    {{-- Marca del final: el PDF mide hasta aquí para recortar la página al largo del ticket. --}}
    <div id="ticket-end" style="height: 1px; font-size: 1px; line-height: 1px;">&nbsp;</div>

    @unless ($pdf)
    <div class="screen-bar">
        <button type="button" class="primary" onclick="window.print()">Imprimir</button>
        <button type="button" onclick="window.close()">Cerrar</button>
    </div>
    @endunless

    @if ($printing)
        <script>
            // Se imprime al cargar (incluido el logo). En caja se abre dentro de un iframe oculto.
            window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 50); });
        </script>
    @endif
</body>
</html>
