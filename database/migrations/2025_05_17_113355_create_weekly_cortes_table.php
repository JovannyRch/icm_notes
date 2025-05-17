<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cortes_semanales', function (Blueprint $table) {
            $table->id();
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->decimal('venta_total', 10, 2);
            $table->decimal('restan_notas', 10, 2);
            $table->decimal('transferencias', 10, 2);
            $table->decimal('entradas', 10, 2);
            $table->decimal('gastos', 10, 2);
            $table->decimal('efectivo', 10, 2);
            $table->decimal('material', 10, 2);
            $table->decimal('sueldos', 10, 2);
            $table->decimal('gastos_extra_total', 10, 2);
            $table->decimal('porcentaje', 10, 2);
            $table->json('cortes')->nullable();
            $table->json('gastos_extra')->nullable();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cortes_semanales');
    }
};
