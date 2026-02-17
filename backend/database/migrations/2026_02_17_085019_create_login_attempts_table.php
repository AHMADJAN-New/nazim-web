<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates login_attempts table in nazim_logs schema for login audit.
     */
    public function up(): void
    {
        Schema::connection('pgsql')->create('nazim_logs.login_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->timestamp('attempted_at')->useCurrent();
            $table->string('email', 255);
            $table->uuid('user_id')->nullable();
            $table->boolean('success')->default(false);
            $table->string('failure_reason', 50)->nullable();
            $table->uuid('organization_id')->nullable();
            $table->uuid('school_id')->nullable();
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->string('login_context', 20)->default('main_app');
            $table->integer('consecutive_failures')->default(0);
            $table->boolean('was_locked')->default(false);

            $table->index(['email', 'attempted_at']);
            $table->index(['organization_id', 'attempted_at']);
            $table->index(['ip_address', 'attempted_at']);
            $table->index(['success', 'attempted_at']);
            $table->index(['attempted_at']);
            $table->index(['user_id', 'attempted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('pgsql')->dropIfExists('nazim_logs.login_attempts');
    }
};
