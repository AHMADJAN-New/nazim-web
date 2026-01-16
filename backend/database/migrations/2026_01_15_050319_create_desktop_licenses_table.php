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
        Schema::create('desktop_licenses', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('kid')->comment('Key ID used for signing');
            $table->string('customer')->comment('Customer name');
            $table->string('edition')->comment('License edition (Standard, Pro, Enterprise, Basic)');
            $table->timestamp('expires')->comment('Expiration date');
            $table->timestamp('issued_at')->comment('Issue date');
            $table->integer('validity_days')->comment('Number of days the license is valid for (stored for reference)');
            $table->integer('seats')->default(1)->comment('Number of seats');
            $table->text('notes')->nullable();
            $table->string('fingerprint_id', 16)->comment('Hardware fingerprint ID (hex, 16 chars)');
            $table->text('payload_b64')->comment('Base64 encoded payload');
            $table->text('signature_b64')->comment('Base64 encoded signature');
            $table->string('license_file_path')->nullable()->comment('Path to saved .dat file');
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            // Indexes
            $table->index('kid');
            $table->index('customer');
            $table->index('fingerprint_id');
            $table->index('expires');
            $table->index('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('desktop_licenses');
    }
};
