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
        if (!Schema::hasTable('fee_exceptions')) {
            Schema::create('fee_exceptions', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('fee_assignment_id');
                $table->uuid('student_id');
                $table->enum('exception_type', ['discount_percentage', 'discount_fixed', 'waiver', 'custom']);
                $table->decimal('exception_amount', 15, 2);
                $table->text('exception_reason');
                $table->uuid('approved_by_user_id');
                $table->timestampTz('approved_at')->default(DB::raw('now()'));
                $table->date('valid_from');
                $table->date('valid_to')->nullable();
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('fee_assignment_id')->references('id')->on('fee_assignments')->onDelete('cascade');
                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
                $table->foreign('approved_by_user_id')->references('id')->on('users')->onDelete('restrict');

                $table->index('organization_id');
                $table->index('fee_assignment_id');
                $table->index('student_id');
                $table->index('is_active');
                $table->index('deleted_at');
            });
        }
    }

    /**
    * Reverse the migrations.
    */
    public function down(): void
    {
        Schema::dropIfExists('fee_exceptions');
    }
};

