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
        Schema::create('event_guests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('event_id');
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('guest_code', 20);
            $table->enum('guest_type', ['student', 'parent', 'teacher', 'staff', 'vip', 'external'])->default('external');
            $table->string('full_name', 200);
            $table->string('phone', 20)->nullable();
            $table->integer('invite_count')->default(1);
            $table->integer('arrived_count')->default(0);
            $table->enum('status', ['invited', 'checked_in', 'blocked'])->default('invited');
            $table->string('photo_path', 500)->nullable();
            $table->string('qr_token', 100)->unique();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('event_id')
                ->references('id')
                ->on('events')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('school_id')
                ->references('id')
                ->on('schools')
                ->onDelete('cascade');

            // Performance indexes for 10k+ guests
            $table->index(['event_id', 'full_name']);
            $table->index(['event_id', 'phone']);
            $table->index(['event_id', 'guest_code']);
            $table->index(['event_id', 'status']);
            $table->index(['event_id', 'guest_type']);
            $table->index('qr_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_guests');
    }
};
