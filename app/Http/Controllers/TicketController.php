<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use App\Models\TicketPrint;
use App\Support\AmountInWords;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;

/**
 * Ticket de 80 mm (Epson TM-T20IV) como página HTML independiente. Con ?print=1 se
 * imprime solo al cargar (Chrome con --kiosk-printing lo manda directo a la impresora
 * predeterminada, sin diálogo) y queda en la bitácora; desde la 2.ª vez sale "REIMPRESIÓN".
 */
class TicketController extends Controller
{
    public function show(Request $request, Note $note)
    {
        abort_unless($this->canView($request, $note), 403, 'No puedes ver este ticket.');

        $printing = $request->boolean('print');
        $reprint = false;
        if ($printing) {
            $reprint = TicketPrint::where('note_id', $note->id)->exists();
            TicketPrint::create(['note_id' => $note->id, 'user_id' => $request->user()->id, 'reprint' => $reprint]);
        }

        return response()
            ->view('tickets.ticket', ['t' => $this->payload($note), 'printing' => $printing, 'reprint' => $reprint, 'sample' => false])
            ->header('Cache-Control', 'no-store');
    }

    /**
     * Destino del QR del ticket. Dueño: abre la nota. Cajero: el ticket, si la venta es suya
     * o puede ver las de su sucursal. Si no existe o no le toca, regresa con un aviso.
     */
    public function verify(Request $request, string $code)
    {
        $user = $request->user();
        $home = $user->can('notes.view') ? 'notas' : ($user->can('sales.create') ? 'caja' : 'profile.edit');
        $note = Note::where('code', strtoupper($code))->first();

        if (! $note) {
            return redirect()->route($home)->with('error', 'No encontré ninguna venta con el código '.strtoupper($code).'.');
        }
        if (! $user->canAccessBranch($note->branch_id)) {
            return redirect()->route($home)->with('error', "La venta {$note->folio} es de otra sucursal.");
        }
        if ($user->can('notes.view')) {
            return redirect()->route('notes.show', $note);
        }
        if ($this->canView($request, $note)) {
            return redirect()->route('tickets.show', $note);
        }

        return redirect()->route($home)->with('error', "No tienes permiso para ver la venta {$note->folio}.");
    }

    /** Ticket de ejemplo para revisar los datos de la sucursal y probar la impresora. */
    public function sample(Request $request, Branch $branch)
    {
        $note = new Note([
            'folio' => '0000', 'customer' => 'Público en general', 'date' => businessToday(), 'flete' => 0,
            'sale_total' => 2745, 'discount' => 100, 'cash_received' => 3000, 'status' => 'paid', 'delivery_status' => 'entregado_a_cliente',
        ]);
        $note->forceFill(['code' => 'PRUEBA2345', 'cash' => 2745, 'card' => 0, 'transfer' => 0, 'balance' => 0, 'created_at' => now()]);
        $note->setRelation('branch', $branch);
        $note->setRelation('seller', $request->user());
        $note->setRelation('items', collect([
            new NoteProduct(['brand' => 'MICHELIN', 'model' => 'PRIMACY 4', 'measure' => '205/55R16', 'quantity' => 1, 'price' => 2500, 'discount' => 0, 'sale_subtotal' => 2500]),
            new NoteProduct(['brand' => 'CEMEX', 'model' => 'CEMENTO GRIS', 'measure' => '50KG', 'quantity' => 1, 'price' => 345, 'discount' => 0, 'sale_subtotal' => 345]),
        ]));

        return response()->view('tickets.ticket', [
            't' => $this->payload($note), 'printing' => $request->boolean('print'), 'reprint' => false, 'sample' => true,
        ]);
    }

    /**
     * Dueños (notes.view): cualquier nota de sus sucursales. Cajero: las suyas (para
     * imprimir al cobrar) y, con sales.view_branch, las de su sucursal.
     */
    private function canView(Request $request, Note $note): bool
    {
        $user = $request->user();
        if (! $user->canAccessBranch($note->branch_id)) {
            return false;
        }
        if ($user->can('notes.view') || $user->can('sales.view_branch')) {
            return true;
        }

        return $note->user_id === $user->id && ($user->can('sales.create') || $user->can('sales.view_own'));
    }

    /** Todo lo que imprime el ticket, ya calculado (la vista sólo da formato). */
    private function payload(Note $note): array
    {
        $items = $note->relationLoaded('items') ? $note->items : $note->items()->orderBy('id')->get();
        $branch = $note->branch;
        $settings = $branch->ticketSettings();
        $tz = config('app.business_timezone');

        $lines = $items->map(function ($i) {
            // Tiendas de pisos: MC son los m² que trae cada caja; se imprime y se suma.
            $mc = str_replace(',', '.', trim((string) $i->mc));
            $perBox = is_numeric($mc) && (float) $mc > 0 ? (float) $mc : null;

            return [
                'quantity' => (float) $i->quantity,
                'description' => trim(implode(' ', array_filter([$i->model, $i->measure]))),
                'price' => (float) $i->price,
                'discount' => (float) ($i->discount ?? 0),
                'amount' => (float) $i->sale_subtotal,
                'm2_per_box' => $perBox,
                'm2' => $perBox ? round($perBox * (float) $i->quantity, 2) : null,
            ];
        });

        // Importe + descuento (no precio × cantidad): en la caja el importe se puede escribir a mano.
        $gross = $lines->sum(fn ($l) => $l['amount'] + $l['discount']);
        $discount = $lines->sum('discount') + (float) ($note->discount ?? 0);
        $total = (float) $note->sale_total;
        $cash = (float) $note->cash;
        $cashReceived = $note->cash_received !== null ? (float) $note->cash_received : null;
        $canceled = $note->delivery_status === 'cancelado' || $note->status === 'canceled';

        return [
            'settings' => $settings,
            'register' => $settings['register_label'],
            'folio' => $note->folio,
            'code' => $note->code,
            'datetime' => ($note->created_at ?? now())->timezone($tz)->format('d/m/Y H:i'),
            // Vendedor: su nombre, un texto genérico ("Vendedor") o nada, según la sucursal.
            'seller' => match ($settings['seller_mode']) {
                'generic' => $settings['seller_label'],
                'none' => null,
                default => $note->seller?->name,
            },
            'customer' => $note->customer,
            'customer_phone' => $note->customer_phone,
            'customer_address' => $note->customer_address,
            'lines' => $lines,
            'units' => $lines->sum('quantity'),
            'm2' => round($lines->sum('m2'), 2),
            'gross' => round($gross, 2),
            'discount' => round($discount, 2),
            'flete' => (float) ($note->flete ?? 0),
            'total' => $total,
            'cash' => $cash,
            'card' => (float) $note->card,
            'transfer' => (float) $note->transfer,
            'cash_received' => $cashReceived,
            'change' => $cashReceived !== null ? round($cashReceived - $cash, 2) : null,
            'balance' => round((float) $note->balance, 2),
            'canceled' => $canceled,
            'amount_in_words' => AmountInWords::pesos($total),
            // El QR lleva el enlace a la venta (/v/CODIGO): al escanearlo con el celular abre
            // la nota o el ticket según quién sea; sin sesión pide iniciarla. Sin datos públicos.
            'qr' => $note->code ? $this->qr(route('notes.verify', $note->code)) : null,
        ];
    }

    /** QR en SVG como data URI: sirve igual en el navegador que en el PDF (dompdf). */
    private function qr(string $content): string
    {
        $svg = (new Writer(new ImageRenderer(new RendererStyle(160, 0), new SvgImageBackEnd)))->writeString($content);

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    /** El mismo ticket en PDF de 80 mm, para guardarlo o mandarlo. No cuenta como impresión. */
    public function pdf(Request $request, Note $note)
    {
        abort_unless($this->canView($request, $note), 403, 'No puedes ver este ticket.');

        $html = view('tickets.ticket', ['t' => $this->payload($note), 'printing' => false, 'reprint' => false, 'sample' => false, 'pdf' => true])->render();
        $name = 'ticket-'.(preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $note->folio) ?: $note->id).'.pdf';

        return response($this->renderPdf($html), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Papel de 80 mm con el largo exacto del ticket: se dibuja una vez en una hoja muy
     * larga, se mide dónde quedó la marca #ticket-end y se vuelve a dibujar con ese alto.
     */
    private function renderPdf(string $html): string
    {
        $width = 80 / 25.4 * 72; // 80 mm en puntos

        $make = function (float $height, ?callable $onEnd = null) use ($html, $width): Dompdf {
            $options = new Options;
            $options->setDefaultMediaType('print');
            $options->setIsRemoteEnabled(false);
            $options->setDefaultFont('Helvetica');
            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($html, 'UTF-8');
            $dompdf->setPaper([0, 0, $width, $height]);
            if ($onEnd) {
                // Al terminar render() dompdf descarta el árbol: la posición se toma al dibujar.
                $dompdf->setCallbacks([['event' => 'end_frame', 'f' => function ($frame) use ($onEnd) {
                    $node = $frame->get_node();
                    if ($node instanceof \DOMElement && $node->getAttribute('id') === 'ticket-end') {
                        $onEnd((float) $frame->get_position('y'));
                    }
                }]]);
            }
            $dompdf->render();

            return $dompdf;
        };

        $height = 1400.0;
        $make(5000, function (float $y) use (&$height) {
            $height = $y + 10;
        });

        return $make(max($height, 200))->output();
    }
}
