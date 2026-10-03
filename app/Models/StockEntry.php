<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Nota de entrada: compra a un proveedor que suma existencias a una sucursal. */
class StockEntry extends Model
{
    protected $fillable = ['branch_id', 'date', 'supplier', 'reference', 'notes', 'total', 'status'];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'total' => 'float',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(StockEntryItem::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
