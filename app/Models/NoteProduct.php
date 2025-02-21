<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NoteProduct extends Model
{
    //table name
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
        'sale_subtotal',
        'purchase_subtotal'
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
