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
        Schema::table('contact_messages', function (Blueprint $table) {
            // Add position/role field
            $table->string('position', 255)->nullable()->after('last_name')->comment('Position/Role (e.g., Principal, Administrator)');
            
            // Add location fields
            $table->string('city', 255)->nullable()->after('school_name');
            $table->string('country', 100)->nullable()->after('city');
            
            // Add preferred contact method
            $table->enum('preferred_contact_method', ['email', 'phone', 'whatsapp'])->nullable()->after('phone')->default('email');
            
            // Add WhatsApp number (separate from phone)
            $table->string('whatsapp', 50)->nullable()->after('preferred_contact_method');
            
            // Add number of schools (for organizations with multiple schools)
            $table->integer('number_of_schools')->nullable()->after('student_count');
            
            // Add staff count
            $table->integer('staff_count')->nullable()->after('number_of_schools');
            
            // Add how they heard about us
            $table->string('referral_source', 255)->nullable()->after('source')->comment('How they heard about us');
            
            // Add urgency level
            $table->enum('urgency', ['low', 'medium', 'high'])->nullable()->after('status')->default('medium');
            
            // Add follow-up date
            $table->date('follow_up_date')->nullable()->after('replied_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropColumn([
                'position',
                'city',
                'country',
                'preferred_contact_method',
                'whatsapp',
                'number_of_schools',
                'staff_count',
                'referral_source',
                'urgency',
                'follow_up_date',
            ]);
        });
    }
};
