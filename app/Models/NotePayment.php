<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotePayment extends Model
{
    /** Tipos de tarjeta (card_type). El importe va en `card`. */
    public const CARD_TYPES = ['credito', 'debito'];

    protected $fillable = [
        'note_id',
        'branch_id',
        'date',
        'cash',
        'card',
        'transfer',
        'card_type',
        'position',
        'description',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'cash' => 'decimal:2',
        'card' => 'decimal:2',
        'transfer' => 'decimal:2',
    ];

    public function note()
    {
        return $this->belongsTo(Note::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /** Suma de los tres métodos de pago de este movimiento. */
    public function total(): float
    {
        return (float) $this->cash + (float) $this->card + (float) $this->transfer;
    }
}
