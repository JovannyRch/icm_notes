<?php

use App\Models\Note;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Base de la venta en caja:
 *  - notes.discount / note_product.discount: descuento en importe. sale_total y
 *    sale_subtotal se siguen guardando NETOS, así cortes, PDF, Excel y dashboard
 *    no cambian. Con 0 (todas las notas existentes) los totales son los mismos.
 *  - note_product.list_price: precio de catálogo al vender (saber si se cambió).
 *  - notes.cash_received: efectivo que entregó el cliente (el cambio se deriva).
 *  - notes.user_id: quién registró la venta.
 *  - notes.code: código único del documento (QR del ticket).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('cash_received', 12, 2)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('code', 16)->nullable()->unique();
        });

        Schema::table('note_product', function (Blueprint $table) {
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('list_price', 12, 2)->nullable();
        });

        // Código para las notas existentes, fila por fila (portable entre motores).
        DB::table('notes')->whereNull('code')->orderBy('id')->select('id')->chunkById(500, function ($notes) {
            foreach ($notes as $note) {
                DB::table('notes')->where('id', $note->id)->update(['code' => Note::generateCode()]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('note_product', function (Blueprint $table) {
            $table->dropColumn(['discount', 'list_price']);
        });

        Schema::table('notes', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['discount', 'cash_received', 'code']);
        });
    }
};
