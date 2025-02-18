<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{



    protected $fillable = ['folio', 'customer', 'date', 'total', 'advance', 'status', 'delivery', 'notes', 'branch_id'];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class)->withPivot('quantity', 'caja_bulto', 'cost', 'iva', 'commission', 'status');
    }
}
