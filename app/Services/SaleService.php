<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NotePayment;
use App\Models\NoteProduct;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Venta de caja. A diferencia de la nota del dueño (donde el navegador manda los
 * importes), aquí el SERVIDOR calcula todo desde el catálogo: precio, costo,
 * subtotales, descuentos y pago. El navegador sólo propone cantidades, y precio y
 * descuentos si el usuario tiene permiso; nada se confía sin validar.
 *
 * Los totales se guardan netos igual que en la nota (ver CLAUDE.md, descuentos),
 * así la venta entra al corte, al dashboard y a /notas sin tratamiento especial.
 */
class SaleService
{
    public const DELIVERED = 'entregado_a_cliente';

    /** Cuántos precios del catálogo actualizó la última venta (para avisarle al cajero). */
    public int $lastCatalogUpdates = 0;

    public function __construct(private StockService $stock = new StockService) {}

    /**
     * @param  array{folio?: ?string, customer?: ?string, customer_phone?: ?string, customer_address?: ?string, notes?: ?string, items: array, discount?: ?float, flete?: ?float, credit?: bool, cash?: ?float, cash_received?: ?float, card?: ?float, card_type?: ?string, transfer?: ?float}  $data
     */
    public function create(User $user, Branch $branch, array $data): Note
    {
        $sale = $this->calculate($user, $branch, $data);

        return DB::transaction(function () use ($user, $branch, $data, $sale) {
            // El cajero no elige el folio (salvo con sales.edit_folio): siempre el siguiente.
            $folio = $user->can('sales.edit_folio') ? trim((string) ($data['folio'] ?? '')) : '';
            if ($folio === '') {
                // Bloquea la sucursal: dos ventas simultáneas no toman el mismo folio.
                Branch::whereKey($branch->id)->lockForUpdate()->first();
                $folio = Note::nextFolio($branch->id);
            }

            $today = businessToday();
            $note = new Note([
                'folio' => $folio,
                'customer' => trim((string) ($data['customer'] ?? '')) ?: 'Público en general',
                'customer_phone' => trim((string) ($data['customer_phone'] ?? '')) ?: null,
                'customer_address' => trim((string) ($data['customer_address'] ?? '')) ?: null,
                'date' => $today,
                'branch_id' => $branch->id,
                'purchase_total' => $sale['purchase_total'],
                'sale_total' => $sale['sale_total'],
                'discount' => $sale['discount'],
                'cash_received' => $sale['cash_received'],
                'flete' => $sale['flete'],
                // Comentario del cajero (opcional); se imprime en el ticket si la sucursal lo tiene encendido.
                'notes' => trim((string) ($data['notes'] ?? '')),
                // A crédito con saldo: "Pendiente" hasta que se registre el resto (dashboard o Notas).
                'status' => $sale['balance'] > 0.009 ? 'pending' : 'paid',
                // El producto de la caja ya está en tienda: la compra queda liquidada, aunque
                // la venta al cliente sea a crédito (eso sólo afecta el `status` de arriba).
                'purchase_status' => 'paid',
                'delivery_status' => self::DELIVERED,
            ]);
            $note->forceFill(['user_id' => $user->id, 'source' => Note::SOURCE_CAJA])->save();

            foreach ($sale['lines'] as $line) {
                NoteProduct::create($line + ['note_id' => $note->id]);
                $this->stock->adjustStock($branch->id, $line['product_id'], $line['quantity'], 'OUT', $note->id, 'Salida por venta en caja #'.$note->folio);
            }

            // Precio desactualizado o vacío: el cajero pidió guardar el nuevo en el catálogo.
            $this->lastCatalogUpdates = count($sale['catalog_updates']);
            foreach ($sale['catalog_updates'] as $productId => $price) {
                $before = Product::whereKey($productId)->value('price');
                Product::whereKey($productId)->update(['price' => $price]);
                Log::info('Precio actualizado desde la caja', ['product_id' => $productId, 'antes' => $before, 'ahora' => $price, 'user_id' => $user->id, 'nota' => $note->folio]);
            }

            // Sin pago (crédito sin abono) no hay fila: los pagos en cero no se guardan.
            if ($sale['cash'] + $sale['card'] + $sale['transfer'] > 0.009) {
                $note->payments()->create([
                    'branch_id' => $branch->id,
                    'date' => $today,
                    'cash' => $sale['cash'],
                    'card' => $sale['card'],
                    'transfer' => $sale['transfer'],
                    'card_type' => $sale['card'] > 0 ? $sale['card_type'] : null,
                    'position' => 0,
                ]);
            }
            $note->recalculateTotalsFromPayments();

            return $note;
        });
    }

    /** Cancela una venta: sin pagos, y las piezas regresan al inventario. */
    /** Prefijo de la línea que deja la cancelación en el comentario de la nota. */
    public const CANCEL_PREFIX = 'CANCELADA';

    /**
     * Cancela la venta: quita sus pagos, regresa las piezas y deja el motivo (con fecha, hora
     * y quién) al final del comentario de la nota, sin borrar lo que ya tenía.
     */
    public function cancel(Note $note, string $reason, User $by): void
    {
        DB::transaction(function () use ($note, $reason, $by) {
            $noteStock = new NoteStockService($this->stock);
            $before = $noteStock->expectedQuantities($note);

            $when = now(config('app.business_timezone'))->format('d/m/Y H:i');
            $line = self::CANCEL_PREFIX." {$when} por {$by->name}. Motivo: ".trim($reason);
            $comments = trim((string) $note->notes);

            $note->update([
                'delivery_status' => 'cancelado',
                'status' => 'canceled',
                'notes' => $comments === '' ? $line : $comments."\n".$line,
            ]);
            $note->payments()->delete();
            $note->recalculateTotalsFromPayments();

            $noteStock->sync($note, $before, [], 'Devolución por cancelación de venta #'.$note->folio);
        });
    }

    /** Calcula y valida la venta sin guardar nada. */
    public function calculate(User $user, Branch $branch, array $data): array
    {
        $errors = [];
        $canChangePrice = $user->can('sales.change_price');
        $catalogUpdates = [];
        // Descuentos: además del permiso, la función debe estar encendida (config/features.php).
        $canDiscount = config('features.discounts') && $user->can('sales.discount');

        $products = Product::whereIn('id', collect($data['items'])->pluck('product_id'))->get()->keyBy('id');
        $extra = $branch->extra_percentage; // el extra global de la sucursal manda

        $lines = [];
        $gross = 0.0;
        $lineDiscounts = 0.0;
        $purchaseTotal = 0.0;

        foreach ($data['items'] as $i => $item) {
            $product = $products->get($item['product_id']);
            $quantity = (int) $item['quantity'];
            $listPrice = round((float) $product->price, 2);
            $price = isset($item['price']) ? round((float) $item['price'], 2) : $listPrice;
            $discount = round((float) ($item['discount'] ?? 0), 2);
            // Importe escrito a mano (p. ej. para cerrar los centavos): manda sobre precio × cantidad
            // y el precio de la partida queda en importe ÷ cantidad. Es un cambio de precio.
            $amount = isset($item['amount']) ? round((float) $item['amount'], 2) : null;
            if ($amount !== null && $quantity > 0) {
                $price = round($amount / $quantity, 2);
                if (abs($amount - $listPrice * $quantity) >= 0.005 && ! $canChangePrice) {
                    $errors["items.{$i}.amount"] = 'No tienes permiso para cambiar el importe.';
                }
            }
            $lineGross = $amount ?? round($price * $quantity, 2);

            if (abs($price - $listPrice) >= 0.005 && ! $canChangePrice) {
                $errors["items.{$i}.price"] = 'No tienes permiso para cambiar precios.';
            }
            if ($price <= 0) {
                $errors["items.{$i}.price"] = $canChangePrice
                    ? "{$product->brand} {$product->model} no tiene precio: escribe el precio."
                    : "{$product->brand} {$product->model} no tiene precio: pide al encargado que se lo ponga.";
            }
            if (! empty($item['update_catalog']) && abs($price - $listPrice) >= 0.005) {
                if ($canChangePrice && $user->can('products.update_price')) {
                    $catalogUpdates[$product->id] = $price;
                } else {
                    $errors["items.{$i}.price"] = 'No tienes permiso para cambiar el precio del catálogo.';
                }
            }
            if ($discount > 0 && ! $canDiscount) {
                $errors["items.{$i}.discount"] = 'No tienes permiso para aplicar descuentos.';
            }
            if ($discount > $lineGross + 0.001) {
                $errors["items.{$i}.discount"] = 'El descuento de '.$product->brand.' '.$product->model.' es mayor que su importe.';
            }

            $lineExtra = $extra ?? (float) $product->extra;
            // Misma fórmula que calculatePurchaseSubtotal() del frontend.
            $purchase = (float) $product->cost * $quantity * (1 + (float) $product->iva / 100) * (1 + $lineExtra / 100);

            $lines[] = [
                'product_id' => $product->id,
                'brand' => $product->brand,
                'model' => $product->model,
                'measure' => $product->measure,
                'mc' => $product->mc,
                'unit' => $product->unit,
                'quantity' => $quantity,
                'cost' => $product->cost,
                'iva' => $product->iva,
                'extra' => $lineExtra,
                'price' => $price,
                'list_price' => $listPrice,
                'discount' => $discount,
                'sale_subtotal' => round($lineGross - $discount, 2),
                'purchase_subtotal' => round($purchase, 2),
                'supplied_status' => 'no_enviado',
                'delivery_status' => self::DELIVERED,
            ];

            $gross += $lineGross;
            $lineDiscounts += $discount;
            $purchaseTotal += $purchase;
        }

        $noteDiscount = round((float) ($data['discount'] ?? 0), 2);
        $linesNet = array_sum(array_column($lines, 'sale_subtotal'));
        if ($noteDiscount > 0 && ! $canDiscount) {
            $errors['discount'] = 'No tienes permiso para aplicar descuentos.';
        }
        if ($noteDiscount > $linesNet + 0.001) {
            $errors['discount'] = 'El descuento es mayor que la venta.';
        }

        // Tope del cajero: todos los descuentos juntos, en % del importe antes de descuentos.
        $max = $user->isCashier() ? $user->max_discount_percent : null;
        $totalDiscount = $lineDiscounts + $noteDiscount;
        if ($max !== null && $gross > 0 && $totalDiscount / $gross * 100 > $max + 0.001) {
            $errors['discount'] = sprintf('Tu tope de descuento es %s%% (esta venta lleva %s%%).', rtrim(rtrim(number_format($max, 2), '0'), '.'), number_format($totalDiscount / $gross * 100, 1));
        }

        // Flete: lo que se cobra por llevar la mercancía; lo escribe el cajero (no es fijo).
        $flete = round((float) ($data['flete'] ?? 0), 2);
        $saleTotal = round($linesNet - $noteDiscount + $flete, 2);

        $card = round((float) ($data['card'] ?? 0), 2);
        // Con tarjeta hay que decir si es de crédito o débito (para cuadrar con la terminal).
        $cardType = in_array($data['card_type'] ?? null, NotePayment::CARD_TYPES, true) ? $data['card_type'] : null;
        if ($card > 0 && $cardType === null) {
            $errors['card_type'] = 'Elige si la tarjeta es de crédito o de débito.';
        }
        $transfer = round((float) ($data['transfer'] ?? 0), 2);
        $credit = ! empty($data['credit']);

        if ($credit) {
            // A crédito: el cliente abona lo que quiera (o nada) y el resto queda como saldo.
            if (! $user->can('sales.credit')) {
                $errors['credit'] = 'No tienes permiso para vender a crédito.';
            }
            $cash = round((float) ($data['cash'] ?? 0), 2);
            $cashReceived = null;
            if ($cash + $card + $transfer > $saleTotal + 0.001) {
                $errors['cash'] = 'El abono es mayor que el total de la venta.';
            }
            // Nombre, teléfono y dirección son opcionales también a crédito (como en las notas).
        } else {
            // De contado: tarjeta y transferencia por su importe, el efectivo cubre el resto.
            $cash = round($saleTotal - $card - $transfer, 2);
            $cashReceived = isset($data['cash_received']) ? round((float) $data['cash_received'], 2) : null;

            if ($cash < -0.001) {
                $errors['card'] = 'Tarjeta y transferencia suman más que el total.';
            } elseif ($cash > 0.001 && ($cashReceived ?? 0) < $cash - 0.001) {
                $errors['cash_received'] = 'Falta efectivo: el cliente debe entregar al menos $'.number_format($cash, 2).'.';
            }
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        return [
            'lines' => $lines,
            'catalog_updates' => $catalogUpdates,
            'discount' => $noteDiscount,
            'flete' => $flete,
            'sale_total' => $saleTotal,
            'purchase_total' => round($purchaseTotal, 2),
            'cash' => max($cash, 0),
            'card' => $card,
            'transfer' => $transfer,
            'card_type' => $cardType,
            'cash_received' => ! $credit && $cash > 0 ? $cashReceived : null,
            'change' => ! $credit && $cash > 0 ? round($cashReceived - $cash, 2) : 0.0,
            'balance' => round($saleTotal - max($cash, 0) - $card - $transfer, 2),
        ];
    }
}
