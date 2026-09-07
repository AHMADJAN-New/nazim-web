<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('client_error_reports')) {
            return;
        }

        Schema::create('client_error_reports', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('client_error_id', 64)->nullable();
            $table->text('message');
            $table->text('stack')->nullable();
            $table->text('component_stack')->nullable();
            $table->text('url')->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('level', 32)->default('component');
            $table->uuid('user_id')->nullable();
            $table->uuid('organization_id')->nullable();
            $table->uuid('school_id')->nullable();
            $table->boolean('user_reported')->default(false);
            $table->text('user_note')->nullable();
            $table->string('status', 32)->default('new');
            $table->text('admin_notes')->nullable();
            $table->uuid('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('user_reported');
            $table->index('organization_id');
            $table->index('created_at');
            $table->index('client_error_id');
            $table->index('level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_error_reports');
    }
};
