<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\NotificationEvent;
use App\Models\StudentAdmission;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TestNotification extends Command
{
    protected $signature = 'notifications:test {admission_id?}';
    protected $description = 'Test notification system for student admissions';

    public function handle(NotificationService $notificationService)
    {
        $admissionId = $this->argument('admission_id');
        
        if ($admissionId) {
            $admission = StudentAdmission::with(['student', 'class', 'academicYear', 'organization'])->find($admissionId);
            if (!$admission) {
                $this->error("Admission not found: {$admissionId}");
                return 1;
            }
        } else {
            $admission = StudentAdmission::with(['student', 'class', 'academicYear', 'organization'])->latest()->first();
            if (!$admission) {
                $this->error("No admissions found in database");
                return 1;
            }
        }

        $this->info("Testing notification for admission: {$admission->id}");
        $this->info("Organization: {$admission->organization_id}");
        $studentName = $admission->student->full_name ?? 'N/A';
        $this->info("Student: {$studentName}");
        
        // Check users with student_admissions.read permission
        $organizationId = $admission->organization_id;
        setPermissionsTeamId($organizationId);
        $usersWithPermission = User::permission('student_admissions.read')->get();
        
        $this->info("\nUsers with 'student_admissions.read' permission:");
        if ($usersWithPermission->isEmpty()) {
            $this->warn("  ❌ No users found with 'student_admissions.read' permission!");
        } else {
            foreach ($usersWithPermission as $user) {
                $this->line("  - {$user->email} (ID: {$user->id})");
            }
        }
        
        // Check users with notifications.read permission
        $usersWithNotificationRead = User::permission('notifications.read')->get();
        $this->info("\nUsers with 'notifications.read' permission:");
        if ($usersWithNotificationRead->isEmpty()) {
            $this->warn("  ❌ No users found with 'notifications.read' permission!");
        } else {
            foreach ($usersWithNotificationRead as $user) {
                $this->line("  - {$user->email} (ID: {$user->id})");
            }
        }
        
        // Check existing notifications
        $existingNotifications = Notification::where('organization_id', $organizationId)
            ->whereHas('event', function($q) use ($admission) {
                $q->where('entity_type', StudentAdmission::class)
                  ->where('entity_id', $admission->id);
            })
            ->get();
        
        $this->info("\nExisting notifications for this admission: {$existingNotifications->count()}");
        foreach ($existingNotifications as $notif) {
            $this->line("  - User: {$notif->user_id}, Title: {$notif->title}, Read: " . ($notif->read_at ? 'Yes' : 'No'));
        }
        
        // Test creating a notification
        $this->info("\n--- Testing notification creation ---");
        $testUser = $usersWithPermission->first();
        if (!$testUser) {
            $this->error("Cannot test: No users with 'student_admissions.read' permission");
            return 1;
        }
        
        try {
            $notificationService->notify(
                'admission.created',
                $admission,
                $testUser, // Actor
                [
                    'title' => 'Test: New Student Admission',
                    'body' => "Test notification for {$studentName}",
                    'url' => "/students/admissions/{$admission->id}",
                ]
            );
            
            $this->info("✅ Notification service called successfully");
            
            // Check if notification was created
            $newNotifications = Notification::where('organization_id', $organizationId)
                ->whereHas('event', function($q) use ($admission) {
                    $q->where('entity_type', StudentAdmission::class)
                      ->where('entity_id', $admission->id)
                      ->where('type', 'admission.created');
                })
                ->where('created_at', '>=', now()->subMinute())
                ->get();
            
            $this->info("Notifications created in last minute: {$newNotifications->count()}");
            foreach ($newNotifications as $notif) {
                $this->line("  - User: {$notif->user_id}, Title: {$notif->title}");
            }
            
        } catch (\Exception $e) {
            $this->error("❌ Error: {$e->getMessage()}");
            $this->error($e->getTraceAsString());
            return 1;
        }
        
        return 0;
    }
}

