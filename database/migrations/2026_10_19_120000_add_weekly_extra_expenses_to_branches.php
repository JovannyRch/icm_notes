<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** branches.weekly_extra_expenses: si el corte semanal maneja gastos extra (gasolina, luz, renta). Sí, por omisión. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->boolean('weekly_extra_expenses')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('branches', fn (Blueprint $table) => $table->dropColumn('weekly_extra_expenses'));
    }
};
