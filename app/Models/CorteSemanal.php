<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CorteSemanal extends Model
{

    protected $table = 'cortes_semanales';

    protected $fillable = [
        'fecha_inicio',
        'fecha_fin',
        'venta_total',
        'restan_notas',
        'transferencias',
        'entradas',
        'gastos',
        'efectivo',
        'material',
        'sueldos',
        'gastos_extra_total',
        'porcentaje',
        'cortes',
        'gastos_extra',
        'branch_id',
    ];
    protected $casts = [
        'cortes' => 'array',
        'gastos_extra' => 'array',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
