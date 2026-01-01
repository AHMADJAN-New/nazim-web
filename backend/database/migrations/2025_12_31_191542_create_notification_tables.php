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
        Schema::create('notification_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->string('type')->index();
            $table->uuid('actor_user_id')->nullable()->index();
            $table->string('entity_type')->index();
            $table->string('entity_id')->index();
            $table->jsonb('payload_json')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('actor_user_id')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->uuid('user_id')->index();
            $table->uuid('event_id')->nullable()->index();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('url')->nullable();
            $table->string('level')->default('info');
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            $table->index(['organization_id', 'user_id', 'created_at']);

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('event_id')->references('id')->on('notification_events')->onDelete('set null');
        });

        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('notification_id')->nullable()->index();
            $table->uuid('user_id')->nullable()->index();
            $table->uuid('event_id')->nullable()->index();
            $table->string('channel')->default('email')->index();
            $table->string('to_address')->index();
            $table->string('status')->default('queued')->index();
            $table->string('provider_message_id')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('notification_id')->references('id')->on('notifications')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('event_id')->references('id')->on('notification_events')->onDelete('set null');
        });

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->uuid('user_id')->index();
            $table->string('type')->index();
            $table->boolean('in_app_enabled')->default(true);
            $table->boolean('email_enabled')->default(false);
            $table->string('frequency')->default('instant');
            $table->timestamps();

            $table->unique(['organization_id', 'user_id', 'type'], 'notification_preferences_unique_per_type');

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('notification_deliveries');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('notification_events');
    }
};
