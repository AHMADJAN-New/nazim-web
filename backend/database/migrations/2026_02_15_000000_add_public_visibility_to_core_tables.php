<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('short_term_courses', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->index();
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->index();
        });

        Schema::table('staff', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->index();
        });
    }

    public function down(): void
    {
        Schema::table('short_term_courses', function (Blueprint $table) {
            $table->dropColumn('is_public');
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->dropColumn('is_public');
        });

        Schema::table('staff', function (Blueprint $table) {
            $table->dropColumn('is_public');
        });
    }
};
