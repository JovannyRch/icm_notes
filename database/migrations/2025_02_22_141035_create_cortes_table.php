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
        Schema::create('cortes', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->decimal('sale_total', 10, 2);
            $table->decimal('notes_total', 10, 2);
            $table->decimal('cash_total', 10, 2);
            $table->decimal('card_total', 10, 2);
            $table->decimal('transfer_total', 10, 2);

            $table->decimal('previous_notes_total', 10, 2);
            $table->decimal('expenses_total', 10, 2);

            $table->json('expenses')->nullable();
            $table->json('notes')->nullable();
            $table->json('previous_notes')->nullable();
            $table->json('returns')->nullable();

            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');

            $table->timestamps();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('cortes');
    }
};
