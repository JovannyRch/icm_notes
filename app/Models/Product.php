<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{

    protected $fillable = ['code', 'type', 'brand', 'model', 'measure', 'description', 'caja_bulto', 'cost', 'iva', 'commission', 'stock'];

    public function notes()
    {
        return $this->belongsToMany(Note::class)->withPivot('quantity', 'caja_bulto', 'cost', 'iva', 'commission', 'status');
    }
}
