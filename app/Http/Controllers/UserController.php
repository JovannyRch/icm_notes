<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Administración de usuarios (sólo super_admin, ruta hidden:users.manage).
 * No se eliminan usuarios: se desactivan, para no perder a quién se atribuye cada venta.
 */
class UserController extends Controller
{
    public function index(Request $request)
    {
        $order = array_keys(config('permissions.roles'));

        $users = User::with('branches:id,name')->orderBy('name')->get()
            ->sortBy(fn (User $u) => array_search($u->role, $order, true))
            ->values()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'active' => $u->active,
                'branches' => $u->branches->map->only('id', 'name')->values(),
                'is_me' => $u->id === $request->user()->id,
            ]);

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => config('permissions.roles'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Users/Form', $this->formOptions());
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $user = DB::transaction(function () use ($data) {
            $user = new User;
            $this->fill($user, $data);
            // Lo da de alta el admin: no hay verificación por correo (las rutas piden 'verified').
            $user->forceFill(['email_verified_at' => now()]);
            $user->save();
            $user->branches()->sync($data['role'] === User::CASHIER ? $data['branches'] : []);

            return $user;
        });

        return redirect()->route('users.index')->with('success', "Usuario {$user->name} creado.");
    }

    public function edit(User $user)
    {
        return Inertia::render('Users/Form', [
            ...$this->formOptions(),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'active' => $user->active,
                'branches' => $user->branches()->pluck('branches.id'),
                // Permisos efectivos (lo guardado o, si no hay, el valor por omisión).
                'permissions' => collect($this->cashierAbilities())
                    ->mapWithKeys(fn ($a, $key) => [$key => (bool) (($user->permissions ?? [])[$key] ?? $a['default'] ?? false)]),
                'max_discount_percent' => $user->max_discount_percent,
            ],
            'isMe' => $user->id === request()->user()->id,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $data = $this->validated($request, $user);

        // Nadie se quita a sí mismo el acceso: quedaría fuera de esta pantalla.
        if ($user->id === $request->user()->id && ($data['role'] !== $user->role || ! $data['active'])) {
            return back()->with('error', 'No puedes cambiar tu propio rol ni desactivarte.');
        }

        DB::transaction(function () use ($user, $data) {
            $this->fill($user, $data);
            $user->save();
            $user->branches()->sync($data['role'] === User::CASHIER ? $data['branches'] : []);
        });

        return redirect()->route('users.index')->with('success', "Usuario {$user->name} actualizado.");
    }

    public function toggleActive(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'No puedes desactivar tu propia cuenta.');
        }

        // Si tiene la sesión abierta, EnsureUserIsActive la cierra en su siguiente clic.
        $user->forceFill(['active' => ! $user->active])->save();

        return back()->with('success', $user->active ? "{$user->name} puede volver a entrar." : "{$user->name} ya no puede entrar al sistema.");
    }

    private function formOptions(): array
    {
        return [
            'roles' => config('permissions.roles'),
            // Con los descuentos apagados (config/features.php) no se ofrece ese permiso.
            'abilities' => collect($this->cashierAbilities())
                ->reject(fn ($a, $key) => $key === 'sales.discount' && ! config('features.discounts'))
                ->map(fn ($a, $key) => ['key' => $key, 'label' => $a['label'], 'default' => (bool) ($a['default'] ?? false)])
                ->values(),
            'allBranches' => Branch::orderBy('id')->get(['id', 'name']),
        ];
    }

    /** Permisos que se configuran por cajero (config/permissions.php, 'cashier' => true). */
    private function cashierAbilities(): array
    {
        return array_filter(config('permissions.abilities'), fn ($a) => ! empty($a['cashier']));
    }

    private function validated(Request $request, ?User $user = null): array
    {
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $isCashier = $request->input('role') === User::CASHIER;

        return $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'role' => ['required', Rule::in(array_keys(config('permissions.roles')))],
            'active' => 'boolean',
            // Al crear es obligatoria; al editar, vacía = conservar la actual.
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8', 'max:255'],
            'branches' => $isCashier ? ['required', 'array', 'min:1'] : ['nullable', 'array'],
            'branches.*' => 'integer|exists:branches,id',
            'permissions' => 'nullable|array',
            'permissions.*' => 'boolean',
            'max_discount_percent' => 'nullable|numeric|min:0|max:100',
        ], [
            'branches.required' => 'Asigna al menos una sucursal al cajero.',
            'branches.min' => 'Asigna al menos una sucursal al cajero.',
            'email.unique' => 'Ya hay un usuario con ese correo.',
            'password.required' => 'Escribe una contraseña inicial.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
        ]);
    }

    private function fill(User $user, array $data): void
    {
        $isCashier = $data['role'] === User::CASHIER;

        $user->fill(['name' => $data['name'], 'email' => $data['email']]);
        if (! empty($data['password'])) {
            $user->password = $data['password']; // cast 'hashed'
        }

        // Para el cajero se guardan TODOS sus permisos explícitos: lo que el admin vio es
        // lo que aplica, aunque luego cambie el valor por omisión de la plantilla.
        $permissions = $isCashier
            ? collect($this->cashierAbilities())
                ->mapWithKeys(fn ($a, $key) => [$key => (bool) (($data['permissions'] ?? [])[$key] ?? $a['default'] ?? false)])
                ->all()
            : null;

        $user->forceFill([
            'role' => $data['role'],
            'active' => $data['active'] ?? true,
            'permissions' => $permissions,
            'max_discount_percent' => $isCashier && ($permissions['sales.discount'] ?? false) ? ($data['max_discount_percent'] ?? null) : null,
        ]);
    }
}
