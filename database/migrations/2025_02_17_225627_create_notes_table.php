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
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->string('folio');
            $table->string('customer')->nullable();
            $table->boolean('archived')->default(false);
            $table->date('date')->useCurrent();

            $table->decimal('purchase_total', 10, 2);
            $table->decimal('sale_total', 10, 2);
            $table->decimal('advance', 10, 2)->default(0);
            $table->decimal('balance', 10, 2)->default(0);



            $table->enum('status', ['pending', 'paid', 'canceled'])->default('pending');
            $table->enum('purchase_status', ['pending', 'paid', 'canceled'])->default('pending');

            $table->string('payment_method')->default('efectivo');
            $table->string('delivery_status')->default('none');
            $table->string('supplied_status')->default('none');

            $table->string('notes')->nullable();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
