<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_maintenance_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('asset_id');
            $table->uuid('organization_id');
            $table->string('maintenance_type', 120)->nullable();
            $table->string('status', 40)->default('scheduled');
            $table->date('performed_on')->nullable();
            $table->date('next_due_date')->nullable();
            $table->decimal('cost', 12, 2)->default(0);
            $table->string('vendor', 150)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('asset_id')->references('id')->on('assets')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations');

            $table->index(['asset_id', 'status']);
            $table->index('organization_id');
        });

        DB::statement(<<<SQL
            ALTER TABLE public.asset_maintenance_records
            ADD CONSTRAINT asset_maintenance_status_valid
            CHECK (status IN ('scheduled', 'in_progress', 'completed'));
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP CONSTRAINT IF EXISTS asset_maintenance_status_valid');
        Schema::dropIfExists('asset_maintenance_records');
    }
};
