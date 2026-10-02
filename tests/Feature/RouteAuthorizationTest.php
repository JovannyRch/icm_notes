<?php

namespace Tests\Feature;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

/**
 * Red de seguridad: ninguna ruta de la app puede quedar sin login o sin permiso.
 * Si agregas una ruta y esto falla, ponla en su bloque de routes/web.php (can:...).
 */
class RouteAuthorizationTest extends TestCase
{
    /** Rutas que sólo necesitan sesión (sin permiso de negocio). */
    private const AUTH_ONLY = [
        'dashboard',          // el controlador redirige a quien no tiene dashboard
        'profile.edit', 'profile.update', 'profile.destroy',
        'set-branch',         // valida en el cierre que la sucursal sea del usuario
        'api/branches',       // devuelve sólo las sucursales del usuario
        'impersonation.stop', // quien está "dentro" es el otro usuario; valida impersonator_id
        'notes.verify',       // QR del ticket: el controlador revisa sucursal y permisos por nota
        'logout', 'password.update', 'password.confirm', 'verification.send', 'verification.verify',
    ];

    /** Rutas públicas a propósito. */
    private const PUBLIC = ['/', 'login', 'up', 'storage/{path}', 'sanctum/csrf-cookie'];

    private function appRoutes(): array
    {
        return collect(RouteFacade::getRoutes()->getRoutes())
            ->filter(fn (Route $r) => ! str_starts_with($r->uri(), '_') && ! str_contains($r->getActionName(), 'Laravel\\'))
            ->all();
    }

    public function test_every_route_requires_login_and_a_permission(): void
    {
        $problems = [];
        $routes = $this->appRoutes();
        $this->assertGreaterThan(50, count($routes), 'La prueba no está viendo las rutas de la app.');

        foreach ($routes as $route) {
            $id = $route->getName() ?? $route->uri();
            if (in_array($route->uri(), self::PUBLIC, true) || in_array($id, self::PUBLIC, true)) {
                continue;
            }

            $middleware = $route->gatherMiddleware();
            $hasAuth = in_array('auth', $middleware, true);
            $hasGuest = in_array('guest', $middleware, true);
            $hasPermission = collect($middleware)->contains(fn ($m) => str_starts_with($m, 'can:') || str_starts_with($m, 'hidden:'));

            if ($hasGuest) {
                continue; // login y recuperar contraseña: sólo para quien no ha iniciado sesión
            }
            if (! $hasAuth) {
                $problems[] = "{$id}: sin auth";
            } elseif (! $hasPermission && ! in_array($id, self::AUTH_ONLY, true) && ! in_array($route->uri(), self::AUTH_ONLY, true)) {
                $problems[] = "{$id}: sin permiso (can:...)";
            }
        }

        $this->assertSame([], $problems, "Rutas sin proteger:\n".implode("\n", $problems));
    }

    public function test_old_public_api_routes_now_require_login(): void
    {
        foreach (['/api/products/search?query=x', '/api/products/stock?branch_id=1&ids[]=1', '/api/branches', '/api/notes/status/pending', '/api/notes/1/2026-01-01', '/api/notes/1/searchByFolio/1'] as $uri) {
            $this->getJson($uri)->assertUnauthorized();
        }
        $this->postJson('/api/export/corte_semanal')->assertUnauthorized();
        $this->postJson('/set-branch', ['branch_id' => 1])->assertUnauthorized();
    }
}
