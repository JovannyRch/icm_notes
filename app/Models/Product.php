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
        // true = el extra global de la sucursal no aplica a este producto (usa el suyo).
        'skip_global_extra',
        'stock',
        'price',
        // Segundo precio (mayoreo); null = sin precio 2.
        'price2',
        'cost',
    ];

    protected $casts = [
        'skip_global_extra' => 'boolean',
    ];

    /** Extra (%) que se le aplica: el global de la sucursal, salvo que el producto esté exento. */
    public function effectiveExtra(?float $globalExtra): float
    {
        return $globalExtra !== null && ! $this->skip_global_extra ? $globalExtra : (float) $this->extra;
    }

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
