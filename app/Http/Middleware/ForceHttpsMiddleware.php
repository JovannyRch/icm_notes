<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceHttpsMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        /*  if ($request->header('x-forwarded-proto') !== 'https' && env('APP_ENV') === 'production') {
            return redirect()->secure($request->getRequestUri());
        } */

        return $next($request);
    }
}
