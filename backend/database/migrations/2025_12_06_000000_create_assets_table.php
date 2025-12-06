<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->uuid('building_id')->nullable();
            $table->uuid('room_id')->nullable();
            $table->string('name');
            $table->string('asset_tag', 100);
            $table->string('category', 150)->nullable();
            $table->string('serial_number', 150)->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 12, 2)->nullable();
            $table->string('status', 40)->default('available');
            $table->string('condition', 50)->nullable();
            $table->string('vendor', 150)->nullable();
            $table->date('warranty_expiry')->nullable();
            $table->text('location_notes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations');
            $table->foreign('school_id')->references('id')->on('school_branding');
            $table->foreign('building_id')->references('id')->on('buildings');
            $table->foreign('room_id')->references('id')->on('rooms');

            $table->unique(['asset_tag', 'organization_id'], 'assets_asset_tag_org_unique');
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('building_id');
            $table->index('room_id');
        });

        DB::statement(<<<SQL
            ALTER TABLE public.assets
            ADD CONSTRAINT assets_status_valid
            CHECK (status IN (
                'available',
                'assigned',
                'maintenance',
                'retired',
                'lost',
                'disposed'
            ));
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP CONSTRAINT IF EXISTS assets_status_valid');
        Schema::dropIfExists('assets');
    }
};
