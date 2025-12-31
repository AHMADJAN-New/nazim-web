<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->uuid('school_id')->nullable();
            
            // Document type and metadata
            $table->string('document_type', 100); // invoice, receipt, budget, report, tax_document, voucher, bank_statement, other
            $table->string('title');
            $table->text('description')->nullable();
            
            // Optional references
            $table->uuid('fee_collection_id')->nullable(); // Link to fee collections
            $table->uuid('student_id')->nullable(); // Link to specific student (for fee receipts)
            $table->uuid('staff_id')->nullable(); // Link to staff (for salary receipts)
            $table->uuid('donor_id')->nullable(); // Link to donors
            $table->uuid('project_id')->nullable(); // Link to finance projects
            $table->uuid('income_entry_id')->nullable(); // Link to income entries
            $table->uuid('expense_entry_id')->nullable(); // Link to expense entries
            $table->uuid('account_id')->nullable(); // Link to finance accounts
            
            // Financial details
            $table->decimal('amount', 15, 2)->nullable(); // Document amount
            $table->string('reference_number', 100)->nullable(); // Invoice/Receipt number
            $table->date('document_date')->nullable(); // Date on the document
            
            // File information
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type', 100)->nullable();
            $table->bigInteger('file_size')->nullable();
            
            // Audit fields
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            // Note: fee_collections FK commented out until table exists
            // $table->foreign('fee_collection_id')->references('id')->on('fee_collections')->onDelete('set null');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('set null');
            $table->foreign('staff_id')->references('id')->on('staff')->onDelete('set null');
            $table->foreign('donor_id')->references('id')->on('donors')->onDelete('set null');
            $table->foreign('project_id')->references('id')->on('finance_projects')->onDelete('set null');
            $table->foreign('income_entry_id')->references('id')->on('income_entries')->onDelete('set null');
            $table->foreign('expense_entry_id')->references('id')->on('expense_entries')->onDelete('set null');
            $table->foreign('account_id')->references('id')->on('finance_accounts')->onDelete('set null');
            $table->foreign('uploaded_by')->references('id')->on('profiles')->onDelete('set null');
            
            // Indexes
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('document_type');
            $table->index('fee_collection_id');
            $table->index('student_id');
            $table->index('staff_id');
            $table->index('donor_id');
            $table->index('project_id');
            $table->index('income_entry_id');
            $table->index('expense_entry_id');
            $table->index('account_id');
            $table->index('document_date');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_documents');
    }
};

