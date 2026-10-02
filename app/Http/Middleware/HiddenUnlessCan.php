<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Como can:<permiso>, pero responde 404 en lugar de 403: para pantallas que no
 * deben delatar que existen (administración del sistema). Uso: hidden:<permiso>.
 */
class HiddenUnlessCan
{
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        abort_unless($request->user()?->can($ability), 404);

        return $next($request);
    }
}
