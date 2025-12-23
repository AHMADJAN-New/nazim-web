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
        Schema::create('event_guest_field_values', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('guest_id');
            $table->uuid('field_id');
            $table->text('value_text')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();

            $table->foreign('guest_id')
                ->references('id')
                ->on('event_guests')
                ->onDelete('cascade');

            $table->foreign('field_id')
                ->references('id')
                ->on('event_type_fields')
                ->onDelete('cascade');

            // Composite index for efficient lookups
            $table->index(['guest_id', 'field_id']);
            $table->unique(['guest_id', 'field_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_guest_field_values');
    }
};
