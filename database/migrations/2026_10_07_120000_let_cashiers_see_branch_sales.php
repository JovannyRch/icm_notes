<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * A petición del cliente, los cajeros ven las ventas de toda su sucursal (no sólo las
 * suyas). Los cajeros creados antes guardaron ese permiso explícito en false: se enciende.
 * Fila por fila (portable entre motores; el JSON se decodifica en PHP).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'cashier')->whereNotNull('permissions')->orderBy('id')->each(function ($user) {
            $permissions = json_decode($user->permissions, true) ?: [];
            if (($permissions['sales.view_branch'] ?? true) === false) {
                $permissions['sales.view_branch'] = true;
                DB::table('users')->where('id', $user->id)->update(['permissions' => json_encode($permissions)]);
            }
        });
    }

    public function down(): void
    {
        // Sin vuelta atrás automática: no se sabe quién lo tenía apagado a propósito.
    }
};
