<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * products.skip_global_extra: el producto no recibe el extra global de la sucursal
 * (usa su propio extra, normalmente 0). Por omisión sí lo recibe, como siempre.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('skip_global_extra')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('skip_global_extra'));
    }
};
