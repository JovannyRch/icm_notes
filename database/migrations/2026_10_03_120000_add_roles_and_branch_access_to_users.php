<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Roles (super_admin, owner, cashier), usuarios activos/inactivos, permisos por
     * cajero y sucursales asignadas. Ver config/permissions.php.
     *
     * Los usuarios existentes quedan como owner (nada cambia para ellos) y los
     * correos de BILLING_ADMIN_EMAILS como super_admin.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('owner')->after('email');
            $table->boolean('active')->default(true)->after('role');
            // Sólo cajeros: { "sales.discount": true, ... } sobre la plantilla del rol.
            $table->json('permissions')->nullable()->after('active');
            $table->decimal('max_discount_percent', 5, 2)->nullable()->after('permissions');
        });

        Schema::create('branch_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['branch_id', 'user_id']);
        });

        $admins = config('billing.admin_emails', []);
        if ($admins) {
            DB::table('users')->whereIn(DB::raw('LOWER(email)'), $admins)->update(['role' => 'super_admin']);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_user');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'active', 'permissions', 'max_discount_percent']);
        });
    }
};
