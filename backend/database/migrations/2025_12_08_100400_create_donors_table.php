<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Donors - Track donor information for donation records
     * Critical for: "How much did I donate this year?" queries
     */
    public function up(): void
    {
        Schema::create('donors', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('name', 255);
            $table->string('phone', 50)->nullable();
            $table->string('email', 255)->nullable();
            $table->text('address')->nullable();
            $table->enum('type', ['individual', 'organization'])->default('individual');
            $table->string('contact_person', 255)->nullable(); // For organization donors
            $table->text('notes')->nullable();
            $table->decimal('total_donated', 15, 2)->default(0); // Denormalized for quick reports
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            // Indexes
            $table->index('organization_id');
            $table->index('is_active');
            $table->index('type');
            $table->index('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('donors');
    }
};
