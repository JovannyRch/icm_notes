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
        Schema::create('note_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_id')->constrained('notes')->cascadeOnDelete();
            // branch_id se denormaliza: el corte consulta pagos por sucursal + fecha
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->date('date');
            $table->decimal('cash', 10, 2)->default(0);
            $table->decimal('card', 10, 2)->default(0);
            $table->decimal('transfer', 10, 2)->default(0);
            $table->unsignedSmallInteger('position')->default(0);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index(['branch_id', 'date']);
            $table->index(['note_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('note_payments');
    }
};
