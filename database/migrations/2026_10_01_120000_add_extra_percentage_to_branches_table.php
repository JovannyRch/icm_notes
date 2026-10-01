<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Extra (%) global de la sucursal. Cuando no es null reemplaza al
     * products.extra de cada producto al agregarlo a una nota de esa sucursal.
     */
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->decimal('extra_percentage', 8, 2)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('extra_percentage');
        });
    }
};
