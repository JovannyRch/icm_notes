<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Corte extends Model
{
    protected $fillable = [
        'date',
        'sale_total',
        'notes_total',
        'cash_total',
        'card_total',
        'transfer_total',
        'previous_notes_total',
        'expenses_total',
        'expenses',
        'notes',
        'returns',
        'previous_notes',
        'branch_id',
    ];

    protected $casts = [
        'expenses' => 'array',
        'notes' => 'array',
        'previous_notes' => 'array',
        'returns' => 'array'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
