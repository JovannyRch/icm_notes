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

            $table->string('code')->nullable();
            $table->string('model')->nullable();
            $table->string('type')->nullable();
            $table->string('brand')->nullable();
            $table->string('measure')->nullable();
            $table->string('unit')->nullable();
            $table->string('mc')->nullable();



            $table->integer('quantity');
            $table->double('cost', 8, 2);
            $table->double('price', 8, 2);
            $table->double('iva', 8, 2);
            $table->double('extra', 8, 2);
            $table->double('sale_subtotal', 8, 2);
            $table->double('purchase_subtotal', 8, 2);


            $table->string('delivery_status')->default('none');
            $table->string('supplied_status')->default('none');


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
