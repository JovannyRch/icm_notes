<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{

    protected $fillable = [
        'code',
        'type',
        'brand',
        'model',
        'measure',
        'mc',
        'unit',
        'iva',
        'extra',
        'stock',
        'price',
        'cost',
    ];
}
