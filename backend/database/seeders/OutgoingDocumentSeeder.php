<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class OutgoingDocumentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates outgoing documents for all organizations with realistic data.
     */
    public function run(): void
    {
        $this->command->info('Seeding outgoing documents...');

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
            $this->command->info("Creating outgoing documents for {$organization->name}...");

            $created = $this->createOutgoingDocumentsForOrganization($organization->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} outgoing document(s) for {$organization->name}");
        }

        $this->command->info("✅ Outgoing documents seeding completed. Total created: {$totalCreated}");
    }

    /**
     * Create outgoing documents for an organization
     */
    protected function createOutgoingDocumentsForOrganization(string $organizationId): int
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

        $users = DB::table('profiles')
            ->where('organization_id', $organizationId)
            ->where('is_active', true)
            ->get();

        $securityLevels = DB::table('security_levels')
            ->where('organization_id', $organizationId)
            ->where('active', true)
            ->get();

        // Get students and staff for recipient_id
        $students = DB::table('students')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->limit(5)
            ->get();

        $staff = DB::table('staff')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->limit(5)
            ->get();

        // Get document settings for prefix
        $docSettings = DB::table('document_settings')
            ->where('organization_id', $organizationId)
            ->first();

        $outgoingPrefix = $docSettings->outgoing_prefix ?? 'OUT';

        // Define sample outgoing documents
        $documents = [
            [
                'subject' => 'نامه پذیرش دانش آموز',
                'description' => 'نامه رسمی پذیرش دانش آموز جدید',
                'recipient_type' => 'student',
                'recipient_id' => null, // Will be set from students
                'external_recipient_name' => null,
                'external_recipient_org' => null,
                'recipient_address' => null,
                'body_html' => '<p>با احترام،</p><p>این نامه به اطلاع می‌رساند که درخواست ثبت نام شما پذیرفته شده است.</p>',
                'issue_date' => Carbon::now()->subDays(2),
                'status' => 'sent',
                'security_level_key' => 'internal',
                'pages_count' => 1,
                'attachments_count' => 0,
            ],
            [
                'subject' => 'نامه به والدین',
                'description' => 'اطلاعیه در مورد جلسه والدین',
                'recipient_type' => 'external',
                'recipient_id' => null,
                'external_recipient_name' => 'والدین دانش آموزان',
                'external_recipient_org' => null,
                'recipient_address' => 'کابل، افغانستان',
                'body_html' => '<p>با احترام،</p><p>به اطلاع می‌رساند که جلسه والدین در تاریخ مشخص برگزار خواهد شد.</p>',
                'issue_date' => Carbon::now()->subDays(5),
                'status' => 'sent',
                'security_level_key' => 'public',
                'pages_count' => 1,
                'attachments_count' => 0,
            ],
            [
                'subject' => 'نامه رسمی به وزارت معارف',
                'description' => 'گزارش سالانه فعالیت های مدرسه',
                'recipient_type' => 'external',
                'recipient_id' => null,
                'external_recipient_name' => 'وزارت معارف',
                'external_recipient_org' => 'وزارت معارف افغانستان',
                'recipient_address' => 'کابل، افغانستان',
                'body_html' => '<p>با احترام،</p><p>گزارش سالانه فعالیت‌های مدرسه به پیوست ارسال می‌گردد.</p>',
                'issue_date' => Carbon::now()->subDays(10),
                'status' => 'sent',
                'security_level_key' => 'confidential',
                'pages_count' => 15,
                'attachments_count' => 3,
            ],
            [
                'subject' => 'نامه به کارمندان',
                'description' => 'اطلاعیه در مورد تغییرات برنامه',
                'recipient_type' => 'staff',
                'recipient_id' => null, // Will be set from staff
                'external_recipient_name' => null,
                'external_recipient_org' => null,
                'recipient_address' => null,
                'body_html' => '<p>با احترام،</p><p>به اطلاع می‌رساند که تغییراتی در برنامه کاری اعمال شده است.</p>',
                'issue_date' => Carbon::now()->subDays(7),
                'status' => 'draft',
                'security_level_key' => 'internal',
                'pages_count' => 2,
                'attachments_count' => 1,
            ],
            [
                'subject' => 'نامه تشکر',
                'description' => 'نامه تشکر از همکاری والدین',
                'recipient_type' => 'external',
                'recipient_id' => null,
                'external_recipient_name' => 'والدین محترم',
                'external_recipient_org' => null,
                'recipient_address' => 'کابل، افغانستان',
                'body_html' => '<p>با احترام،</p><p>از همکاری و پشتیبانی شما صمیمانه تشکر می‌کنیم.</p>',
                'issue_date' => Carbon::now()->subDays(3),
                'status' => 'sent',
                'security_level_key' => 'public',
                'pages_count' => 1,
                'attachments_count' => 0,
            ],
            [
                'subject' => 'نامه اخطار',
                'description' => 'نامه اخطار به دانش آموز',
                'recipient_type' => 'student',
                'recipient_id' => null, // Will be set from students
                'external_recipient_name' => null,
                'external_recipient_org' => null,
                'recipient_address' => null,
                'body_html' => '<p>با احترام،</p><p>این نامه به عنوان اخطار در مورد رفتار نامناسب ارسال می‌گردد.</p>',
                'issue_date' => Carbon::now()->subDays(1),
                'status' => 'draft',
                'security_level_key' => 'confidential',
                'pages_count' => 1,
                'attachments_count' => 0,
            ],
        ];

        // Get starting document number
        $lastSequence = DB::table('document_sequences')
            ->where('organization_id', $organizationId)
            ->where('doc_type', 'outgoing')
            ->where('prefix', $outgoingPrefix)
            ->where('year_key', Carbon::now()->format('Y'))
            ->first();

        $nextNumber = $lastSequence ? $lastSequence->last_number + 1 : 1;

        foreach ($documents as $index => $docData) {
            // Check if document already exists (by subject and issue_date)
            $exists = DB::table('outgoing_documents')
                ->where('organization_id', $organizationId)
                ->where('subject', $docData['subject'])
                ->where('issue_date', $docData['issue_date'])
                ->exists();

            if ($exists) {
                $this->command->info("  ⚠ Outgoing document '{$docData['subject']}' already exists. Skipping.");
                continue;
            }

            // Get random related data
            $schoolId = $schools->isNotEmpty() ? $schools->random()->id : null;
            $academicYearId = $academicYears->isNotEmpty() ? $academicYears->random()->id : null;
            $signedByUserId = $users->isNotEmpty() ? $users->random()->id : null;

            // Set recipient_id based on recipient_type
            $recipientId = null;
            if ($docData['recipient_type'] === 'student' && $students->isNotEmpty()) {
                $recipientId = $students->random()->id;
            } elseif ($docData['recipient_type'] === 'staff' && $staff->isNotEmpty()) {
                $recipientId = $staff->random()->id;
            }

            // Get security level
            $securityLevel = $securityLevels->firstWhere('key', $docData['security_level_key']);
            if (!$securityLevel && $securityLevels->isNotEmpty()) {
                $securityLevel = $securityLevels->first();
            }

            // Generate document number
            $docNumber = $nextNumber + $index;
            $fullDocNumber = "{$outgoingPrefix}-{$docNumber}/" . Carbon::now()->format('Y');

            // Create document
            $docId = (string) Str::uuid();

            DB::table('outgoing_documents')->insert([
                'id' => $docId,
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'academic_year_id' => $academicYearId,
                'security_level_key' => $securityLevel ? $securityLevel->key : null,
                'outdoc_prefix' => $outgoingPrefix,
                'outdoc_number' => $docNumber,
                'full_outdoc_number' => $fullDocNumber,
                'is_manual_number' => false,
                'manual_outdoc_number' => null,
                'recipient_type' => $docData['recipient_type'],
                'recipient_id' => $recipientId,
                'external_recipient_name' => $docData['external_recipient_name'],
                'external_recipient_org' => $docData['external_recipient_org'],
                'recipient_address' => $docData['recipient_address'],
                'subject' => $docData['subject'],
                'description' => $docData['description'],
                'pages_count' => $docData['pages_count'],
                'attachments_count' => $docData['attachments_count'],
                'body_html' => $docData['body_html'],
                'pdf_path' => null,
                'issue_date' => $docData['issue_date'],
                'signed_by_user_id' => $signedByUserId,
                'status' => $docData['status'],
                'announcement_scope' => null,
                'table_payload' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $created++;
            $this->command->info("  ✓ Created outgoing document: {$docData['subject']} ({$fullDocNumber})");
        }

        return $created;
    }
}

