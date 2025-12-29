<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            // Contact Information
            $table->string('email', 255)->nullable()->after('slug');
            $table->string('phone', 50)->nullable()->after('email');
            $table->string('website', 255)->nullable()->after('phone');
            
            // Address Information
            $table->string('street_address', 500)->nullable()->after('website');
            $table->string('city', 100)->nullable()->after('street_address');
            $table->string('state_province', 100)->nullable()->after('city');
            $table->string('country', 100)->nullable()->after('state_province');
            $table->string('postal_code', 20)->nullable()->after('country');
            
            // Registration & Legal Information
            $table->string('registration_number', 100)->nullable()->after('postal_code');
            $table->string('tax_id', 100)->nullable()->after('registration_number');
            $table->string('license_number', 100)->nullable()->after('tax_id');
            
            // Organization Details
            $table->string('type', 100)->nullable()->after('license_number'); // e.g., 'school', 'university', 'institute'
            $table->text('description')->nullable()->after('type');
            $table->date('established_date')->nullable()->after('description');
            $table->boolean('is_active')->default(true)->after('established_date');
            
            // Contact Person Information
            $table->string('contact_person_name', 255)->nullable()->after('is_active');
            $table->string('contact_person_email', 255)->nullable()->after('contact_person_name');
            $table->string('contact_person_phone', 50)->nullable()->after('contact_person_email');
            $table->string('contact_person_position', 100)->nullable()->after('contact_person_phone');
            
            // Media
            $table->string('logo_url', 500)->nullable()->after('contact_person_position');
            
            // Indexes for common queries
            $table->index('email');
            $table->index('is_active');
            $table->index('type');
            $table->index('country');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropIndex(['email']);
            $table->dropIndex(['is_active']);
            $table->dropIndex(['type']);
            $table->dropIndex(['country']);
            
            $table->dropColumn([
                'email',
                'phone',
                'website',
                'street_address',
                'city',
                'state_province',
                'country',
                'postal_code',
                'registration_number',
                'tax_id',
                'license_number',
                'type',
                'description',
                'established_date',
                'is_active',
                'contact_person_name',
                'contact_person_email',
                'contact_person_phone',
                'contact_person_position',
                'logo_url',
            ]);
        });
    }
};
