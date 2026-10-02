<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Una impresión del ticket de una nota (bitácora de reimpresiones). */
class TicketPrint extends Model
{
    protected $fillable = ['note_id', 'user_id', 'reprint'];

    protected $casts = ['reprint' => 'boolean'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
