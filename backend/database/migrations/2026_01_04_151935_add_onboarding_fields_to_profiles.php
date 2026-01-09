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
        Schema::table('profiles', function (Blueprint $table) {
            $table->boolean('has_completed_onboarding')->default(false)->after('is_event_user');
            $table->boolean('has_completed_tour')->default(false)->after('has_completed_onboarding');
            $table->timestamp('onboarding_completed_at')->nullable()->after('has_completed_tour');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['has_completed_onboarding', 'has_completed_tour', 'onboarding_completed_at']);
        });
    }
};
