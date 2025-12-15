<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class IncomingDocumentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates incoming documents for all organizations with realistic data.
     */
    public function run(): void
    {
        $this->command->info('Seeding incoming documents...');

        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        $totalCreated = 0;

        foreach ($organizations as $organization) {
            $this->command->info("Creating incoming documents for {$organization->name}...");

            $created = $this->createIncomingDocumentsForOrganization($organization->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} incoming document(s) for {$organization->name}");
        }

        $this->command->info("✅ Incoming documents seeding completed. Total created: {$totalCreated}");
    }

    /**
     * Create incoming documents for an organization
     */
    protected function createIncomingDocumentsForOrganization(string $organizationId): int
    {
        $created = 0;

        // Get related data for this organization
        $schools = DB::table('school_branding')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->get();

        $academicYears = DB::table('academic_years')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->get();

        $departments = DB::table('departments')
            ->where('organization_id', $organizationId)
            ->get();

        $users = DB::table('profiles')
            ->where('organization_id', $organizationId)
            ->where('is_active', true)
            ->get();

        $securityLevels = DB::table('security_levels')
            ->where('organization_id', $organizationId)
            ->where('active', true)
            ->get();

        // Get document settings for prefix
        $docSettings = DB::table('document_settings')
            ->where('organization_id', $organizationId)
            ->first();

        $incomingPrefix = $docSettings->incoming_prefix ?? 'IN';

        // Define sample incoming documents
        $documents = [
            [
                'subject' => 'درخواست ثبت نام',
                'description' => 'درخواست ثبت نام جدید دانش آموز از والدین',
                'sender_name' => 'احمد محمد',
                'sender_org' => 'والدین دانش آموزان',
                'sender_address' => 'کابل، افغانستان',
                'external_doc_number' => 'EXT-2024-001',
                'external_doc_date' => Carbon::now()->subDays(5),
                'received_date' => Carbon::now()->subDays(3),
                'status' => 'pending',
                'security_level_key' => 'internal',
                'pages_count' => 2,
                'attachments_count' => 1,
                'notes' => 'نیاز به بررسی دارد',
            ],
            [
                'subject' => 'نامه رسمی از وزارت معارف',
                'description' => 'نامه رسمی در مورد سیاست های جدید آموزشی',
                'sender_name' => 'وزارت معارف',
                'sender_org' => 'وزارت معارف افغانستان',
                'sender_address' => 'کابل، افغانستان',
                'external_doc_number' => 'MOE-2024-045',
                'external_doc_date' => Carbon::now()->subDays(10),
                'received_date' => Carbon::now()->subDays(8),
                'status' => 'routed',
                'security_level_key' => 'confidential',
                'pages_count' => 5,
                'attachments_count' => 0,
                'notes' => 'به بخش مدیریت ارجاع شده است',
            ],
            [
                'subject' => 'درخواست کمک مالی',
                'description' => 'درخواست کمک مالی از سازمان خیریه',
                'sender_name' => 'عبدالرحمن احمدی',
                'sender_org' => 'سازمان خیریه افغانستان',
                'sender_address' => 'کابل، افغانستان',
                'external_doc_number' => 'CHARITY-2024-012',
                'external_doc_date' => Carbon::now()->subDays(15),
                'received_date' => Carbon::now()->subDays(12),
                'status' => 'completed',
                'security_level_key' => 'public',
                'pages_count' => 3,
                'attachments_count' => 2,
                'notes' => 'پردازش شده و پاسخ داده شده است',
            ],
            [
                'subject' => 'گزارش بازرسی',
                'description' => 'گزارش بازرسی از ساختمان مدرسه',
                'sender_name' => 'کمیسیون بازرسی',
                'sender_org' => 'کمیسیون بازرسی دولتی',
                'sender_address' => 'کابل، افغانستان',
                'external_doc_number' => 'INSP-2024-078',
                'external_doc_date' => Carbon::now()->subDays(20),
                'received_date' => Carbon::now()->subDays(18),
                'status' => 'archived',
                'security_level_key' => 'confidential',
                'pages_count' => 8,
                'attachments_count' => 3,
                'notes' => 'بایگانی شده',
            ],
            [
                'subject' => 'درخواست همکاری',
                'description' => 'درخواست همکاری در پروژه آموزشی',
                'sender_name' => 'مؤسسه آموزشی بین المللی',
                'sender_org' => 'مؤسسه آموزشی بین المللی',
                'sender_address' => 'کابل، افغانستان',
                'external_doc_number' => 'COOP-2024-023',
                'external_doc_date' => Carbon::now()->subDays(7),
                'received_date' => Carbon::now()->subDays(5),
                'status' => 'pending',
                'security_level_key' => 'internal',
                'pages_count' => 4,
                'attachments_count' => 1,
                'notes' => 'در انتظار بررسی',
            ],
            [
                'subject' => 'نامه تشکر',
                'description' => 'نامه تشکر از والدین دانش آموز',
                'sender_name' => 'خانواده احمدی',
                'sender_org' => null,
                'sender_address' => 'کابل، افغانستان',
                'external_doc_number' => null,
                'external_doc_date' => null,
                'received_date' => Carbon::now()->subDays(2),
                'status' => 'completed',
                'security_level_key' => 'public',
                'pages_count' => 1,
                'attachments_count' => 0,
                'notes' => 'پاسخ داده شده است',
            ],
        ];

        // Get starting document number
        $lastSequence = DB::table('document_sequences')
            ->where('organization_id', $organizationId)
            ->where('doc_type', 'incoming')
            ->where('prefix', $incomingPrefix)
            ->where('year_key', Carbon::now()->format('Y'))
            ->first();

        $nextNumber = $lastSequence ? $lastSequence->last_number + 1 : 1;

        foreach ($documents as $index => $docData) {
            // Check if document already exists (by subject and received_date)
            $exists = DB::table('incoming_documents')
                ->where('organization_id', $organizationId)
                ->where('subject', $docData['subject'])
                ->where('received_date', $docData['received_date'])
                ->exists();

            if ($exists) {
                $this->command->info("  ⚠ Incoming document '{$docData['subject']}' already exists. Skipping.");
                continue;
            }

            // Get random related data
            $schoolId = $schools->isNotEmpty() ? $schools->random()->id : null;
            $academicYearId = $academicYears->isNotEmpty() ? $academicYears->random()->id : null;
            $departmentId = $departments->isNotEmpty() ? $departments->random()->id : null;
            $assignedUserId = $users->isNotEmpty() ? $users->random()->id : null;
            $createdBy = $users->isNotEmpty() ? $users->random()->id : null;

            // Get security level
            $securityLevel = $securityLevels->firstWhere('key', $docData['security_level_key']);
            if (!$securityLevel && $securityLevels->isNotEmpty()) {
                $securityLevel = $securityLevels->first();
            }

            // Generate document number
            $docNumber = $nextNumber + $index;
            $fullDocNumber = "{$incomingPrefix}-{$docNumber}/" . Carbon::now()->format('Y');

            // Create document
            $docId = (string) Str::uuid();

            DB::table('incoming_documents')->insert([
                'id' => $docId,
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'academic_year_id' => $academicYearId,
                'security_level_key' => $securityLevel ? $securityLevel->key : null,
                'indoc_prefix' => $incomingPrefix,
                'indoc_number' => $docNumber,
                'full_indoc_number' => $fullDocNumber,
                'is_manual_number' => false,
                'manual_indoc_number' => null,
                'external_doc_number' => $docData['external_doc_number'],
                'external_doc_date' => $docData['external_doc_date'],
                'sender_name' => $docData['sender_name'],
                'sender_org' => $docData['sender_org'],
                'sender_address' => $docData['sender_address'],
                'subject' => $docData['subject'],
                'description' => $docData['description'],
                'pages_count' => $docData['pages_count'],
                'attachments_count' => $docData['attachments_count'],
                'received_date' => $docData['received_date'],
                'routing_department_id' => $departmentId,
                'assigned_to_user_id' => $assignedUserId,
                'status' => $docData['status'],
                'notes' => $docData['notes'],
                'created_by' => $createdBy,
                'updated_by' => $createdBy,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $created++;
            $this->command->info("  ✓ Created incoming document: {$docData['subject']} ({$fullDocNumber})");
        }

        return $created;
    }
}

