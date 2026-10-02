<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['name', 'extra_percentage', 'ticket'];

    protected $casts = [
        'extra_percentage' => 'float',
        'ticket' => 'array',
    ];

    /** Campos del ticket que se configuran por sucursal. */
    public const TICKET_FIELDS = ['business_name', 'rfc', 'address', 'phone', 'header', 'footer'];

    /** Datos del ticket con valores por omisión para lo que no se ha configurado. */
    public function ticketSettings(): array
    {
        $saved = array_filter($this->ticket ?? [], fn ($v) => $v !== null && $v !== '');

        return array_merge([
            'business_name' => 'Ideas Modernas de Construcción',
            'rfc' => '',
            'address' => '',
            'phone' => '',
            'header' => '',
            'footer' => '¡Gracias por su compra!',
            'show_logo' => true,
        ], $saved);
    }

    public function notes()
    {
        return $this->hasMany(Note::class);
    }
}
