<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Venta puesta en espera en caja: ver la migración para el porqué. */
class HeldSale extends Model
{
    protected $fillable = ['branch_id', 'user_id', 'label', 'payload'];

    protected $casts = [
        'payload' => 'array',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
