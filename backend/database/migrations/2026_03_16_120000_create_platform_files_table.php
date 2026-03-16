<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_files', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('category', 50);
            $table->string('title');
            $table->text('notes')->nullable();
            $table->string('file_path', 500);
            $table->string('file_name');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('uploaded_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_files');
    }
};
