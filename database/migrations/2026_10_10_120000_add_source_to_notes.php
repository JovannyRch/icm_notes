<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * De dónde salió cada nota: 'caja' (venta de mostrador) o 'nota' (formulario del dueño).
 * Lo usa el panel de uso del sistema para medir cuánto se usa la caja.
 *
 * Las notas anteriores se clasifican por aproximación: es de caja si guardó el efectivo
 * recibido (sólo la caja lo captura) o si la hizo un cajero (sólo tiene la caja).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('source', 10)->nullable()->index();
        });

        $cashiers = DB::table('users')->where('role', 'cashier')->pluck('id');
        DB::table('notes')
            ->where(fn ($q) => $q->whereNotNull('cash_received')->orWhereIn('user_id', $cashiers))
            ->update(['source' => 'caja']);
        DB::table('notes')->whereNull('source')->update(['source' => 'nota']);
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropIndex(['source']);
            $table->dropColumn('source');
        });
    }
};
