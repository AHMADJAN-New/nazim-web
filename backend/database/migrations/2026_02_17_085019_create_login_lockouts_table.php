<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates login_lockouts table in nazim_logs schema.
     */
    public function up(): void
    {
        Schema::connection('pgsql')->create('nazim_logs.login_lockouts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('email', 255);
            $table->timestamp('locked_at')->useCurrent();
            $table->timestamp('unlocked_at')->nullable();
            $table->string('unlock_reason', 50)->nullable();
            $table->uuid('unlocked_by')->nullable();
            $table->integer('failed_attempt_count');
            $table->string('ip_address', 45);

            $table->index('email');
            $table->index('unlocked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('pgsql')->dropIfExists('nazim_logs.login_lockouts');
    }
};
