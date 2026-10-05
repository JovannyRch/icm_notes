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

    /** Textos del ticket por sucursal (vacío = el valor por omisión). */
    public const TICKET_FIELDS = ['business_name', 'rfc', 'address', 'phone', 'header', 'footer', 'farewell', 'register_label', 'seller_label'];

    /** Qué se imprime (interruptores) — todos encendidos por omisión. */
    public const TICKET_TOGGLES = ['show_logo', 'show_business_name', 'show_register', 'show_customer', 'show_m2', 'show_amount_in_words', 'show_payment', 'show_qr', 'show_farewell', 'show_notes'];

    /** Cómo aparece quién vendió: su nombre, un texto genérico ("Vendedor") o nada. */
    public const SELLER_MODES = ['name', 'generic', 'none'];

    /** Valores por omisión del ticket de esta sucursal. */
    public function ticketDefaults(): array
    {
        return [
            'business_name' => 'Ideas Modernas de Construcción',
            'rfc' => '',
            'address' => '',
            'phone' => '',
            'header' => '',
            // footer: términos y condiciones (opcional); farewell: la despedida, al final.
            'footer' => '',
            'farewell' => '¡Gracias por su compra! Vuelva pronto.',
            'register_label' => 'CAJA '.mb_strtoupper($this->name),
            'seller_label' => 'Vendedor',
            'seller_mode' => 'name',
            'copies' => 1,
            ...array_fill_keys(self::TICKET_TOGGLES, true),
        ];
    }

    /** Lo que imprime el ticket: lo guardado y, para lo vacío, los valores por omisión. */
    public function ticketSettings(): array
    {
        $saved = array_filter($this->ticket ?? [], fn ($v) => $v !== null && $v !== '');

        return array_merge($this->ticketDefaults(), $saved);
    }

    public function notes()
    {
        return $this->hasMany(Note::class);
    }
}
