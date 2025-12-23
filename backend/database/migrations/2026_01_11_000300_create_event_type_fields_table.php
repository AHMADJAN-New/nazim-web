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
        Schema::create('event_type_fields', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('event_type_id');
            $table->uuid('field_group_id')->nullable();
            $table->string('key', 50);
            $table->string('label', 100);
            $table->enum('field_type', [
                'text',
                'textarea',
                'phone',
                'number',
                'select',
                'multiselect',
                'date',
                'toggle',
                'email',
                'id_number',
                'address',
                'photo',
                'file'
            ])->default('text');
            $table->boolean('is_required')->default(false);
            $table->boolean('is_enabled')->default(true);
            $table->integer('sort_order')->default(0);
            $table->string('placeholder', 255)->nullable();
            $table->string('help_text', 255)->nullable();
            $table->json('validation_rules')->nullable();
            $table->json('options')->nullable();
            $table->timestamps();

            $table->foreign('event_type_id')
                ->references('id')
                ->on('event_types')
                ->onDelete('cascade');

            $table->foreign('field_group_id')
                ->references('id')
                ->on('event_type_field_groups')
                ->onDelete('set null');

            $table->index(['event_type_id', 'sort_order']);
            $table->index(['event_type_id', 'is_enabled']);
            $table->unique(['event_type_id', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_type_fields');
    }
};
