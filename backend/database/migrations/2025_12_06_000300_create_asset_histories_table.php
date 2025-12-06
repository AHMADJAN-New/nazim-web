<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_histories', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('asset_id');
            $table->uuid('organization_id');
            $table->string('event_type', 80);
            $table->text('description')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->foreign('asset_id')->references('id')->on('assets')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations');

            $table->index(['asset_id', 'event_type']);
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_histories');
    }
};
