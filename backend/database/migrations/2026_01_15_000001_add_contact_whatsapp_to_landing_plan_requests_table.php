<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_plan_requests', function (Blueprint $table) {
            $table->string('contact_whatsapp', 50)->nullable()->after('contact_phone');
        });
    }

    public function down(): void
    {
        Schema::table('landing_plan_requests', function (Blueprint $table) {
            $table->dropColumn('contact_whatsapp');
        });
    }
};

