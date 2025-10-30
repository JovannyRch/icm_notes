<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = ['branch_id', 'product_id', 'movement_type', 'quantity', 'note_id', 'description'];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function note()
    {
        return $this->belongsTo(Note::class);
    }
}
