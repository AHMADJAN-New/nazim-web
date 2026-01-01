<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_plan_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('requested_plan_id')->nullable();
            $table->string('organization_name', 255);
            $table->string('school_name', 255);
            $table->string('school_page_url', 500)->nullable();
            $table->string('contact_name', 255);
            $table->string('contact_email', 255);
            $table->string('contact_phone', 50)->nullable();
            $table->string('contact_position', 100)->nullable();
            $table->integer('number_of_schools')->nullable();
            $table->integer('student_count')->nullable();
            $table->integer('staff_count')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->text('message')->nullable();
            $table->timestamps();

            $table->foreign('requested_plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_plan_requests');
    }
};
