<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Pago mensual del sistema (lo que el negocio le paga al desarrollador),
 * no confundir con NotePayment. Un registro por mes pagado.
 */
class ServicePayment extends Model
{
    protected $fillable = ['period', 'paid_at', 'amount', 'notes'];

    protected $casts = [
        'paid_at' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];
}
