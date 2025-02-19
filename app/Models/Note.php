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
        'supplied_status',
        'archived',
        'purchase_total',
        'sale_total',
        'payment_method'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
