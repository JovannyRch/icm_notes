<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NoteProduct extends Model
{
    // table name
    protected $table = 'note_product';

    protected $fillable = [
        'brand',
        'model',
        'measure',
        'mc',
        'unit',
        'iva',
        'extra',
        'stock',
        'cost',
        'price',
        'delivery_status',
        'supplied_status',
        'note_id',
        'product_id',
        'position',
        'quantity',
        'status',
        'sale_subtotal',     // neto: price * quantity - discount
        'purchase_subtotal',
        'discount',          // descuento de la partida (importe)
        'list_price',        // precio de catálogo al vender
        'price_level',       // 1 = precio público, 2 = precio 2 (mayoreo)
    ];

    public function note()
    {
        return $this->belongsTo(Note::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
