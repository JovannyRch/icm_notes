<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Un gate por permiso de config/permissions.php: las rutas usan can:<permiso>.
        foreach (array_keys(config('permissions.abilities')) as $ability) {
            Gate::define($ability, fn (User $user) => $user->hasPermission($ability));
        }

        // Buscar productos y existencias: lo necesita quien arma notas, ventas o entradas.
        Gate::define('products.search', fn (User $user) => $user->hasPermission('sales.create')
            || $user->hasPermission('notes.manage')
            || $user->hasPermission('stock.manage')
            || $user->hasPermission('products.manage'));

        // Nombres anteriores, conservados por compatibilidad.
        Gate::define('admin', fn (User $user) => $user->hasPermission('users.manage'));
        Gate::define('manage-billing', fn (User $user) => $user->hasPermission('billing.manage'));
    }
}
