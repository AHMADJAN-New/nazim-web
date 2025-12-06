<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('library_books')) {
            return;
        }

        Schema::create('library_books', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('title');
            $table->string('author')->nullable();
            $table->string('isbn')->nullable();
            $table->string('category')->nullable();
            $table->string('volume')->nullable();
            $table->text('description')->nullable();
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->integer('default_loan_days')->default(30);
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('title');
            $table->index('author');
            $table->index('isbn');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_books');
    }
};
