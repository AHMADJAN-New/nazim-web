<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Staff assigned to a facility (imam, muezzin, caretaker, etc.).
     */
    public function up(): void
    {
        Schema::create('facility_staff', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('facility_id');
            $table->string('role', 100);
            $table->uuid('staff_id')->nullable();
            $table->string('display_name', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->text('notes')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('facility_id')->references('id')->on('org_facilities')->onDelete('cascade');
            $table->foreign('staff_id')->references('id')->on('staff')->onDelete('set null');

            $table->index('facility_id');
            $table->index('staff_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facility_staff');
    }
};
