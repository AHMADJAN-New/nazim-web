<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('security_levels')) {
            Schema::create('security_levels', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->string('key', 50);
                $table->string('label', 100);
                $table->unsignedInteger('rank');
                $table->boolean('active')->default(true);
                $table->timestamps();

                $table->unique(['organization_id', 'key']);
                $table->index(['organization_id', 'rank']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('departments')) {
            Schema::create('departments', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('name', 120);
                $table->timestamps();

                $table->unique(['organization_id', 'school_id', 'name']);
                $table->index('school_id');
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('user_department')) {
            Schema::create('user_department', function (Blueprint $table) {
                $table->uuid('user_id');
                $table->uuid('department_id');
                $table->timestamps();

                $table->primary(['user_id', 'department_id']);
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('department_id')->references('id')->on('departments')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('document_sequences')) {
            Schema::create('document_sequences', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('doc_type', 20);
                $table->string('prefix', 50);
                $table->string('year_key', 20);
                $table->unsignedInteger('last_number')->default(0);
                $table->timestamps();

                $table->unique(['organization_id', 'school_id', 'doc_type', 'prefix', 'year_key'], 'document_sequences_unique_scope');
                $table->index(['organization_id', 'school_id']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('document_settings')) {
            Schema::create('document_settings', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('incoming_prefix', 20)->nullable();
                $table->string('outgoing_prefix', 20)->nullable();
                $table->string('year_mode', 20)->default('gregorian');
                $table->boolean('reset_yearly')->default(true);
                $table->timestamps();

                $table->unique(['organization_id', 'school_id']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('incoming_documents')) {
            Schema::create('incoming_documents', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('security_level_key', 50)->nullable();
                $table->string('indoc_prefix', 20)->nullable();
                $table->unsignedInteger('indoc_number')->nullable();
                $table->string('full_indoc_number', 120)->nullable();
                $table->boolean('is_manual_number')->default(false);
                $table->string('manual_indoc_number', 120)->nullable();
                $table->string('external_doc_number', 120)->nullable();
                $table->date('external_doc_date')->nullable();
                $table->string('sender_name', 255)->nullable();
                $table->string('sender_org', 255)->nullable();
                $table->string('sender_address', 255)->nullable();
                $table->string('subject', 500)->nullable();
                $table->date('received_date')->nullable();
                $table->uuid('routing_department_id')->nullable();
                $table->uuid('assigned_to_user_id')->nullable();
                $table->string('status', 50)->default('pending');
                $table->text('notes')->nullable();
                $table->uuid('created_by')->nullable();
                $table->uuid('updated_by')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'school_id']);
                $table->index(['full_indoc_number', 'organization_id'], 'idx_incoming_full_number_org');
                $table->index(['subject', 'received_date']);
                $table->index(['security_level_key']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('routing_department_id')->references('id')->on('departments')->onDelete('set null');
                $table->foreign('assigned_to_user_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('outgoing_documents')) {
            Schema::create('outgoing_documents', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('security_level_key', 50)->nullable();
                $table->string('outdoc_prefix', 20)->nullable();
                $table->unsignedInteger('outdoc_number')->nullable();
                $table->string('full_outdoc_number', 120)->nullable();
                $table->boolean('is_manual_number')->default(false);
                $table->string('manual_outdoc_number', 120)->nullable();
                $table->string('recipient_type', 50);
                $table->uuid('recipient_id')->nullable();
                $table->string('external_recipient_name', 255)->nullable();
                $table->string('external_recipient_org', 255)->nullable();
                $table->string('recipient_address', 255)->nullable();
                $table->string('subject', 500)->nullable();
                $table->longText('body_html')->nullable();
                $table->string('pdf_path', 255)->nullable();
                $table->date('issue_date')->nullable();
                $table->uuid('signed_by_user_id')->nullable();
                $table->string('status', 50)->default('draft');
                $table->jsonb('announcement_scope')->nullable();
                $table->jsonb('table_payload')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'school_id']);
                $table->index(['full_outdoc_number', 'organization_id'], 'idx_outgoing_full_number_org');
                $table->index(['subject', 'issue_date']);
                $table->index(['security_level_key']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('signed_by_user_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('document_links')) {
            Schema::create('document_links', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->uuid('incoming_document_id')->nullable();
                $table->uuid('outgoing_document_id')->nullable();
                $table->string('relation_type', 50)->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'school_id']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('incoming_document_id')->references('id')->on('incoming_documents')->onDelete('cascade');
                $table->foreign('outgoing_document_id')->references('id')->on('outgoing_documents')->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('document_files')) {
            Schema::create('document_files', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('owner_type', 30);
                $table->uuid('owner_id');
                $table->string('file_type', 30);
                $table->string('original_name', 255);
                $table->string('mime_type', 120)->nullable();
                $table->unsignedBigInteger('size_bytes')->default(0);
                $table->string('storage_path', 255);
                $table->string('sha256', 100)->nullable();
                $table->unsignedInteger('version')->default(1);
                $table->uuid('uploaded_by_user_id')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'school_id']);
                $table->index(['owner_type', 'owner_id']);
                $table->index(['file_type', 'version']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('uploaded_by_user_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('letter_templates')) {
            Schema::create('letter_templates', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('name', 255);
                $table->string('category', 50)->nullable();
                $table->longText('body_html')->nullable();
                $table->jsonb('variables')->nullable();
                $table->boolean('allow_edit_body')->default(false);
                $table->string('default_security_level_key', 50)->nullable();
                $table->string('page_layout', 30)->default('A4_portrait');
                $table->boolean('is_mass_template')->default(false);
                $table->boolean('active')->default(true);
                $table->timestamps();

                $table->index(['organization_id', 'school_id']);
                $table->index(['category', 'active']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('letterheads')) {
            Schema::create('letterheads', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->string('name', 255);
                $table->string('file_path', 255);
                $table->string('default_for_layout', 30)->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();

                $table->index(['organization_id', 'school_id']);
                $table->index(['default_for_layout', 'active']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            });
        }

        if (!Schema::hasTable('document_audit_logs')) {
            Schema::create('document_audit_logs', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id')->nullable();
                $table->uuid('actor_user_id');
                $table->string('action', 50);
                $table->string('doc_type', 30);
                $table->uuid('doc_id');
                $table->jsonb('meta')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['organization_id', 'school_id']);
                $table->index(['doc_type', 'doc_id']);
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
                $table->foreign('actor_user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('document_audit_logs');
        Schema::dropIfExists('letterheads');
        Schema::dropIfExists('letter_templates');
        Schema::dropIfExists('document_files');
        Schema::dropIfExists('document_links');
        Schema::dropIfExists('outgoing_documents');
        Schema::dropIfExists('incoming_documents');
        Schema::dropIfExists('document_settings');
        Schema::dropIfExists('document_sequences');
        Schema::dropIfExists('user_department');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('security_levels');
    }
};
