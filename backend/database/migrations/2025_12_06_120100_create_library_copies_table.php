<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('library_copies')) {
            return;
        }

        Schema::create('library_copies', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('book_id');
            $table->string('copy_code')->nullable();
            $table->string('status')->default('available');
            $table->date('acquired_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('book_id')->references('id')->on('library_books');
            $table->index(['book_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_copies');
    }
};
