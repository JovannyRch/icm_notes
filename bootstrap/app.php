<?php

use App\Http\Middleware\ForceHttpsMiddleware;
use App\Http\Middleware\TrustProxies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            ForceHttpsMiddleware::class,
            TrustProxies::class,
            \App\Http\Middleware\EnsureUserIsActive::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'hidden' => \App\Http\Middleware\HiddenUnlessCan::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Pantallas de error con el diseño de la app en lugar de las de Laravel (Pages/Error.tsx).
        // 403/404 siempre; 500/503 sólo sin APP_DEBUG, para no esconder el detalle en desarrollo.
        // Las peticiones JSON (axios) conservan su respuesta JSON.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();
            if ($request->expectsJson()) {
                return $response;
            }
            if ($status === 419) {
                return back()->with('error', 'La página expiró. Vuelve a intentarlo.');
            }
            if (! in_array($status, [403, 404], true) && ! (in_array($status, [500, 503], true) && ! config('app.debug'))) {
                return $response;
            }
            // Sólo los mensajes propios en español (abort(403, '...')); no el genérico en inglés.
            $message = $status === 403 && $e->getMessage() !== 'This action is unauthorized.' ? $e->getMessage() : null;

            return Inertia::render('Error', ['status' => $status, 'message' => $message ?: null, 'appVersion' => config('app.version')])
                ->toResponse($request)
                ->setStatusCode($status);
        });
    })->create();
