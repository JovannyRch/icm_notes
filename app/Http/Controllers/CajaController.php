<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

/**
 * Pantalla de caja del cajero. Fase 1: sólo existe la entrada y el permiso
 * (sales.create); la caja completa se construye en la fase 4.
 */
class CajaController extends Controller
{
    public function index()
    {
        return Inertia::render('Caja/Index');
    }
}
