<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NoteProduct extends Model
{
    protected $fillable = ['note_id', 'product_id', 'position', 'code', 'type', 'brand', 'model', 'measure', 'description', 'quantity', 'caja_bulto', 'cost', 'iva', 'commission', 'status'];

    public function note()
    {
        return $this->belongsTo(Note::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
