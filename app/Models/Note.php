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
        // card2/transfer2/cash2/second_payment_date quedan como columnas legacy:
        // los pagos viven en note_payments desde la migración de N pagos.
    ];

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
