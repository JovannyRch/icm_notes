<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * A petición del cliente, los cajeros pueden cambiar el precio en la venta (productos sin
 * precio o con precio desactualizado). Los creados antes lo guardaron explícito en false.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'cashier')->whereNotNull('permissions')->orderBy('id')->each(function ($user) {
            $permissions = json_decode($user->permissions, true) ?: [];
            if (($permissions['sales.change_price'] ?? true) === false) {
                $permissions['sales.change_price'] = true;
                DB::table('users')->where('id', $user->id)->update(['permissions' => json_encode($permissions)]);
            }
        });
    }

    public function down(): void
    {
        // Sin vuelta atrás automática: no se sabe quién lo tenía apagado a propósito.
    }
};
