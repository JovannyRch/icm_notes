<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['name', 'extra_percentage'];

    protected $casts = [
        'extra_percentage' => 'float',
    ];

    public function notes()
    {
        return $this->hasMany(Note::class);
    }
}
