<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add area, location details, and coordinates to org_facilities.
     */
    public function up(): void
    {
        Schema::table('org_facilities', function (Blueprint $table) {
            $table->decimal('area_sqm', 12, 2)->nullable()->after('address');
            $table->string('city', 100)->nullable()->after('area_sqm');
            $table->string('district', 100)->nullable()->after('city');
            $table->string('landmark', 255)->nullable()->after('district');
            $table->decimal('latitude', 10, 7)->nullable()->after('landmark');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('org_facilities', function (Blueprint $table) {
            $table->dropColumn(['area_sqm', 'city', 'district', 'landmark', 'latitude', 'longitude']);
        });
    }
};
