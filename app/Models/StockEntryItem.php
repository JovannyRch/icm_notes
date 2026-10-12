<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockEntryItem extends Model
{
    protected $fillable = ['product_id', 'brand', 'model', 'measure', 'mc', 'unit', 'quantity', 'cost', 'iva', 'extra', 'subtotal'];

    protected $casts = [
        'quantity' => 'float',
        'cost' => 'float',
        'iva' => 'float',
        'extra' => 'float',
        'subtotal' => 'float',
    ];

    /** Producto del catálogo (null si se borró: la partida conserva su copia). */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** Lo que se le paga al proveedor por la partida: costo × cantidad con IVA y extra (como calculatePurchaseSubtotal). */
    public static function subtotalFor(float $cost, float $quantity, float $iva, float $extra): float
    {
        return round($cost * $quantity * (1 + $iva / 100) * (1 + $extra / 100), 2);
    }
}
