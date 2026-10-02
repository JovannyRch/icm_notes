<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    protected $fillable = ['branch_id', 'product_id', 'quantity', 'counted_at'];

    protected $casts = [
        'counted_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }
}
