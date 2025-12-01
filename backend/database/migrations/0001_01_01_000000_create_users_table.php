<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates users table with UUID primary key (for multi-tenant SaaS)
     */
    public function up(): void
    {
        // Enable pgcrypto extension for UUID generation
        try {
            \Illuminate\Support\Facades\DB::statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        } catch (\Exception $e) {
            // Extension might already exist or require superuser privileges
            // Continue anyway
        }

        // Create users table with UUID primary key
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(\Illuminate\Support\Facades\DB::raw('gen_random_uuid()'));
            $table->string('email')->unique();
            $table->string('encrypted_password');
            $table->timestamp('email_confirmed_at')->nullable();
            $table->timestamps();
        });

        // Create index on email for faster lookups
        Schema::table('users', function (Blueprint $table) {
            $table->index('email');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->uuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
