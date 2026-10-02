<?php

namespace App\Http\Middleware;

use App\Http\Controllers\ImpersonationController;
use App\Models\Branch;
use App\Models\User;
use App\Services\BillingStatusService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'errors' => fn() => $request->session()->get('errors')
                ? $request->session()->get('errors')->getBag('default')->getMessages()
                : (object) [],
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
            ],
            'auth' => [
                'user' => $request->user(),
            ],
            'currentBranch' => fn() => currentBranchId(),
            // Sólo las sucursales del usuario; orderBy explícito: Postgres reordena tras un UPDATE.
            'branches' => fn() => Branch::whereIn('id', $request->user()?->accessibleBranchIds() ?? [])
                ->orderBy('id')->get(['id', 'name', 'extra_percentage']),
            // El aviso de pago del sistema no lo ven los cajeros.
            'billing' => fn() => $request->user()?->can('billing.notice') ? app(BillingStatusService::class)->status() : null,
            'canManageBilling' => fn() => $request->user() && Gate::allows('manage-billing'),
            // Permisos del usuario: el frontend arma la navegación y los botones con ellos.
            // El servidor sigue validando cada ruta (can:); esto sólo es presentación.
            'permissions' => fn() => $request->user()?->grantedPermissions() ?? [],
            // "Entrar como": quién es el super_admin que está viendo el sistema como este usuario.
            'impersonator' => fn() => $request->session()->has(ImpersonationController::SESSION_KEY)
                ? User::find($request->session()->get(ImpersonationController::SESSION_KEY))?->only('id', 'name')
                : null,
        ];
    }
}
