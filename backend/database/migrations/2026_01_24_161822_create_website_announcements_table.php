<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('website_announcements', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id')->nullable();
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->string('title');
            $table->text('content')->nullable();
            $table->string('status')->default('draft'); // draft, scheduled, published, archived
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
            
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('status');
            $table->index('published_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_announcements');
    }
};
