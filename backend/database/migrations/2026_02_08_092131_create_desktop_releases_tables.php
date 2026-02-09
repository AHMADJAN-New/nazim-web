<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Desktop releases — stores installer files and metadata
        Schema::create('desktop_releases', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('version', 50);               // e.g. "2.1.0"
            $table->string('display_name', 255);          // e.g. "Nazim Desktop v2.1.0"
            $table->text('release_notes')->nullable();    // changelog / description (HTML allowed)
            $table->string('file_path', 500)->nullable(); // storage path to the .exe/.msi
            $table->string('file_name', 255)->nullable(); // original upload filename
            $table->bigInteger('file_size')->nullable();   // bytes
            $table->string('file_hash', 128)->nullable();  // SHA-256
            $table->string('status', 20)->default('draft'); // draft | published | archived
            $table->boolean('is_latest')->default(false);
            $table->unsignedBigInteger('download_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('version');
            $table->index('status');
            $table->index('is_latest');
        });

        // Desktop prerequisites — separate downloadable dependency files
        Schema::create('desktop_prerequisites', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('name', 255);                  // e.g. ".NET 8 Runtime"
            $table->string('version', 50)->nullable();     // e.g. "8.0.4"
            $table->text('description')->nullable();
            $table->string('file_path', 500)->nullable();
            $table->string('file_name', 255)->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->string('file_hash', 128)->nullable();
            $table->integer('install_order')->default(0);
            $table->boolean('is_required')->default(true);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('download_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index('install_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('desktop_prerequisites');
        Schema::dropIfExists('desktop_releases');
    }
};
