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
        Schema::table('notes', function (Blueprint $table) {
            $table->decimal('transfer2', 10, 2)->nullable()->after('transfer');
            $table->decimal('card2', 10, 2)->nullable()->after('card');
            $table->decimal('cash2', 10, 2)->nullable()->after('cash');
            $table->date('second_payment_date')->nullable()->after('cash2');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn('transfer2');
            $table->dropColumn('card2');
            $table->dropColumn('cash2');
            $table->dropColumn('second_payment_date');
        });
    }
};
