<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_order_form_payments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_order_form_id');
            $table->uuid('organization_id');
            $table->string('payment_type', 30);
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 3)->default('AFN');
            $table->date('payment_date');
            $table->string('payment_method', 80)->nullable();
            $table->string('payment_reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_order_form_id')
                ->references('id')
                ->on('organization_order_forms')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index('organization_order_form_id');
            $table->index('organization_id');
            $table->index('payment_type');
            $table->index('payment_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_order_form_payments');
    }
};

