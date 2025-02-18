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
        Schema::create('note_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->constrained('notes')->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');

            $table->integer('position')->nullable();
            $table->string('code')->nullable();
            $table->string('type')->nullable();
            $table->string('brand')->nullable();
            $table->string('measure')->nullable();
            $table->string('description')->nullable();
            $table->string('model')->nullable();


            $table->integer('quantity');
            $table->double('caja_bulto', 10, 2);
            $table->double('cost', 8, 2);
            $table->double('iva', 8, 2);
            $table->double('commission', 8, 2);
            $table->enum('status', ['entregado', 'pagado_x_enviar', 'pagador_x_recoger'])->default('pagador_x_recoger');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('note_product');
    }
};
