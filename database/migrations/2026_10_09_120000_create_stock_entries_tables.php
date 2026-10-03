<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nota de entrada como documento: antes sólo sumaba existencias (stock_movements) y no
 * quedaba registro de qué se compró, a quién ni cuánto se le debe al proveedor. Cada
 * partida guarda una copia del producto y del costo, IVA y extra con que entró.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            $table->string('supplier')->nullable();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total', 12, 2)->default(0);
            $table->string('status', 20)->default('pending'); // pending | paid (al proveedor)
            $table->timestamps();
            $table->index(['branch_id', 'date']);
        });

        Schema::create('stock_entry_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_entry_id')->constrained()->cascadeOnDelete();
            // Los productos se borran de verdad (sin SoftDeletes): la partida conserva su copia.
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('measure')->nullable();
            $table->string('mc')->nullable();
            $table->string('unit')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->decimal('cost', 12, 2);
            $table->decimal('iva', 6, 2)->default(0);
            $table->decimal('extra', 6, 2)->default(0);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_entry_items');
        Schema::dropIfExists('stock_entries');
    }
};
