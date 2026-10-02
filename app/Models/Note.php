<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = [
        'folio',
        'customer',
        'date',
        'total',
        'advance',
        'balance',
        'status',
        'purchase_status',
        'notes',
        'branch_id',
        'purchase_total',
        'sale_total',
        'payment_method',
        'delivery_status',
        'archived',
        'sale_total',
        'payment_method',
        'flete',
        'card',
        'transfer',
        'cash',
        'discount',       // descuento sobre el total de la nota (importe); sale_total ya es neto
        'cash_received',  // efectivo entregado por el cliente; el cambio se deriva
        // user_id (quién vendió) y code (código del documento) no son asignables en masa.
        // card2/transfer2/cash2/second_payment_date quedan como columnas legacy:
        // los pagos viven en note_payments desde la migración de N pagos.
    ];

    /** Alfabeto sin 0/O ni 1/I/L: el código se puede dictar o teclear desde el ticket. */
    private const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    protected static function booted(): void
    {
        static::creating(function (Note $note) {
            $note->code ??= self::generateCode();
        });
    }

    /** Código único del documento (para el QR del ticket). 31^10 combinaciones. */
    public static function generateCode(): string
    {
        do {
            $code = '';
            for ($i = 0; $i < 10; $i++) {
                $code .= self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)];
            }
        } while (static::query()->where('code', $code)->exists());

        return $code;
    }

    /** Siguiente folio de la sucursal: el mayor folio numérico + 1 (los no numéricos se ignoran). */
    public static function nextFolio(int $branchId): string
    {
        $max = 0;
        // Se compara en PHP: castear texto a número difiere (y truena en Postgres) entre motores.
        foreach (static::query()->where('branch_id', $branchId)->select('folio')->cursor() as $note) {
            $folio = trim((string) $note->folio);
            if ($folio !== '' && ctype_digit($folio) && strlen($folio) <= 15) {
                $max = max($max, (int) $folio);
            }
        }

        return (string) ($max + 1);
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function payments()
    {
        return $this->hasMany(NotePayment::class)->orderBy('position');
    }

    public function items()
    {
        return $this->hasMany(NoteProduct::class);
    }

    /**
     * Recalcula los agregados derivados de los pagos y los persiste.
     *
     * notes.cash/card/transfer son la suma de TODOS los pagos (así los consumen
     * el corte, el PDF y los reportes); advance es el total abonado y balance lo
     * que resta. Antes esto lo calculaba el navegador.
     */
    public function recalculateTotalsFromPayments(): void
    {
        $payments = $this->payments()->get();

        $cash = (float) $payments->sum('cash');
        $card = (float) $payments->sum('card');
        $transfer = (float) $payments->sum('transfer');
        $advance = $cash + $card + $transfer;

        $this->forceFill([
            'cash' => $cash,
            'card' => $card,
            'transfer' => $transfer,
            'advance' => $advance,
            'balance' => (float) $this->sale_total - $advance,
        ])->save();
    }
}
