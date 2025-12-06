<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('asset_id');
            $table->uuid('organization_id');
            $table->string('assigned_to_type', 30);
            $table->uuid('assigned_to_id')->nullable();
            $table->date('assigned_on')->nullable();
            $table->date('expected_return_date')->nullable();
            $table->date('returned_on')->nullable();
            $table->string('status', 30)->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('asset_id')->references('id')->on('assets')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations');

            $table->index(['asset_id', 'status']);
            $table->index('organization_id');
        });

        DB::statement(<<<SQL
            ALTER TABLE public.asset_assignments
            ADD CONSTRAINT asset_assignments_status_valid
            CHECK (status IN ('active', 'returned', 'transferred'));
        SQL);

        DB::statement(<<<SQL
            ALTER TABLE public.asset_assignments
            ADD CONSTRAINT asset_assignments_type_valid
            CHECK (assigned_to_type IN ('staff', 'student', 'room', 'other'));
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP CONSTRAINT IF EXISTS asset_assignments_status_valid');
        DB::statement('DROP CONSTRAINT IF EXISTS asset_assignments_type_valid');
        Schema::dropIfExists('asset_assignments');
    }
};
