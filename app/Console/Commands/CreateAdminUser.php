<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Crea (o actualiza) una cuenta del sistema sin dejar la contraseña en el código.
 *
 *   php artisan user:create-admin                       # pide la contraseña oculta
 *   php artisan user:create-admin --password=secreto    # queda en el historial del shell
 *
 * Es idempotente: si el correo ya existe, actualiza nombre y contraseña.
 */
class CreateAdminUser extends Command
{
    protected $signature = 'user:create-admin
                            {--email=jovannyrch@gmail.com : Correo de la cuenta}
                            {--name=Jovanny : Nombre visible}
                            {--password= : Contraseña (si se omite se pide de forma oculta)}
                            {--role=super_admin : super_admin, owner o cashier}
                            {--branches= : Sucursales del cajero, ids separados por coma (p. ej. 1,2)}';

    protected $description = 'Crea o actualiza un usuario del sistema (rol y sucursales) con correo verificado';

    public function handle(): int
    {
        $email = strtolower(trim($this->option('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error("Correo inválido: {$email}");

            return self::FAILURE;
        }

        $role = $this->option('role');
        if (! array_key_exists($role, config('permissions.roles'))) {
            $this->error("Rol inválido: {$role}. Usa: ".implode(', ', array_keys(config('permissions.roles'))));

            return self::FAILURE;
        }

        $password = $this->option('password');
        if ($password === null) {
            $password = $this->secret('Contraseña');
            if ($password !== $this->secret('Confirma la contraseña')) {
                $this->error('Las contraseñas no coinciden.');

                return self::FAILURE;
            }
        }

        if (strlen((string) $password) < 8) {
            $this->error('La contraseña debe tener al menos 8 caracteres.');

            return self::FAILURE;
        }

        $user = User::updateOrCreate(
            ['email' => $email],
            ['name' => $this->option('name'), 'password' => Hash::make($password)]
        );

        // Las rutas exigen 'verified' y la app no tiene flujo de verificación.
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now(), 'role' => $role, 'active' => true])->save();

        if ($this->option('branches') !== null) {
            $user->branches()->sync(array_filter(array_map('intval', explode(',', $this->option('branches')))));
        }

        $this->info(($user->wasRecentlyCreated ? 'Usuario creado: ' : 'Usuario actualizado: ').$email." ({$role})");

        return self::SUCCESS;
    }
}
