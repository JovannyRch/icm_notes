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
        // `php artisan about` muestra la versión de ICM Notes.
        \Illuminate\Foundation\Console\AboutCommand::add('ICM Notes', fn () => ['Versión' => config('app.version')]);

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

        // "Mis ventas" de la caja: con ver las propias o las de la sucursal.
        Gate::define('sales.history', fn (User $user) => $user->hasPermission('sales.view_own')
            || $user->hasPermission('sales.view_branch'));

        // Ticket de una nota: el controlador revisa además de quién es la nota.
        Gate::define('tickets.view', fn (User $user) => $user->hasPermission('notes.view')
            || $user->hasPermission('sales.create')
            || $user->hasPermission('sales.view_own')
            || $user->hasPermission('sales.view_branch'));

        // Nombres anteriores, conservados por compatibilidad.
        Gate::define('admin', fn (User $user) => $user->hasPermission('users.manage'));
        Gate::define('manage-billing', fn (User $user) => $user->hasPermission('billing.manage'));
    }
}
