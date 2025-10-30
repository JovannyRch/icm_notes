<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{

    protected $fillable = [
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

    public function stockMovements()
    {
        $currentBranch = currentBranchId();
        return $this->hasMany(StockMovement::class)->where('branch_id', $currentBranch);
    }

    public function stock()
    {
        $currentBranch = currentBranchId();
        return $this->hasOne(Stock::class)->where('branch_id', $currentBranch);
    }
}
