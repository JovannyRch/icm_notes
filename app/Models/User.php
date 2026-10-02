<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    public const SUPER_ADMIN = 'super_admin';

    public const OWNER = 'owner';

    public const CASHIER = 'cashier';

    /** Mismos valores por omisión que la columna, para modelos recién creados. */
    protected $attributes = [
        'role' => self::OWNER,
        'active' => true,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * role, active, permissions y max_discount_percent NO son asignables en masa:
     * ningún formulario (p. ej. el del perfil) debe poder elevar sus permisos. Se
     * asignan explícitamente con forceFill() desde la administración de usuarios.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'permissions',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
            'permissions' => 'array',
            'max_discount_percent' => 'float',
        ];
    }

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class)->withTimestamps();
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::SUPER_ADMIN;
    }

    public function isCashier(): bool
    {
        return $this->role === self::CASHIER;
    }

    /**
     * ¿Tiene el permiso? (ver config/permissions.php)
     *  - inactivo: nada.
     *  - super_admin: todo.
     *  - owner: todo salvo lo marcado super_admin_only (también puede vender en caja).
     *  - cashier: sólo permisos configurables, con su valor por usuario o el de la plantilla.
     */
    public function hasPermission(string $ability): bool
    {
        // Ojo: las llaves llevan punto (notes.manage); config('a.b.notes.manage') las
        // tomaría como anidadas. Se lee el catálogo completo y se indexa a mano.
        $definition = config('permissions.abilities')[$ability] ?? null;
        if (! $definition || ! $this->active) {
            return false;
        }

        return match ($this->role) {
            self::SUPER_ADMIN => true,
            self::OWNER => empty($definition['super_admin_only']),
            self::CASHIER => ! empty($definition['cashier'])
                && (bool) (($this->permissions ?? [])[$ability] ?? $definition['default'] ?? false),
            default => false,
        };
    }

    /** Permisos concedidos, para el frontend (navegación y botones). */
    public function grantedPermissions(): array
    {
        return array_values(array_filter(
            array_keys(config('permissions.abilities')),
            fn ($ability) => $this->hasPermission($ability)
        ));
    }

    /** Sucursales en las que puede trabajar: todas para owner y super_admin. */
    public function accessibleBranchIds(): array
    {
        if (! $this->isCashier()) {
            return Branch::orderBy('id')->pluck('id')->all();
        }

        return $this->branches()->orderBy('branches.id')->pluck('branches.id')->all();
    }

    public function canAccessBranch(?int $branchId): bool
    {
        return $branchId !== null && in_array($branchId, $this->accessibleBranchIds(), true);
    }
}
