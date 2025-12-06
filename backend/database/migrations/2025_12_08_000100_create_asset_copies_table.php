<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('asset_copies')) {
            return;
        }

        Schema::create('asset_copies', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('asset_id');
            $table->uuid('organization_id');
            $table->string('copy_code')->nullable();
            $table->string('status')->default('available');
            $table->date('acquired_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('asset_id')->references('id')->on('assets')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            $table->index(['asset_id', 'status']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_copies');
    }
};

