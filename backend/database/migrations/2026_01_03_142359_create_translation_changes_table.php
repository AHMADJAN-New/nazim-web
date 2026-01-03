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
        Schema::create('translation_changes', function (Blueprint $table) {
            $table->id();
            $table->string('file_name'); // en.ts, ps.ts, etc.
            $table->string('language', 10); // en, ps, fa, ar
            $table->integer('keys_changed')->default(0);
            $table->json('changed_keys')->nullable(); // Array of changed key paths
            $table->string('status')->default('pending'); // pending, built
            $table->timestamp('last_modified_at');
            $table->timestamp('built_at')->nullable();
            $table->uuid('modified_by')->nullable();
            $table->foreign('modified_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamps();
            
            $table->index(['file_name', 'status']);
            $table->index('last_modified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('translation_changes');
    }
};
