<?php

namespace App\Services;

use App\Models\UserTour;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Service for assigning tours to users based on permissions
 */
class TourAssignmentService
{
    /**
     * Tour definitions with their required permissions
     * 
     * Format: [
     *   'tour_id' => [
     *     'title' => 'Tour Title',
     *     'description' => 'Tour Description',
     *     'version' => '1.0.0',
     *     'required_permissions' => ['permission1', 'permission2'], // All must be present
     *     'trigger_route' => '/route', // Optional: route that triggers this tour
     *   ]
     * ]
     */
    private array $tourDefinitions = [
        'initialSetup' => [
            'title' => 'Initial Setup Tour',
            'description' => 'A guided tour to help new users set up their school and understand core features.',
            'version' => '1.0.0',
            'required_permissions' => [], // Available to all users
            'trigger_route' => null,
        ],
        'examsFlow' => [
            'title' => 'Exams Flow Tutorial',
            'description' => 'Learn how to create and manage exams, assign subjects, and generate results.',
            'version' => '1.0.0',
            'required_permissions' => ['exams.read', 'exams.create'], // User must have both
            'trigger_route' => '/exams',
        ],
        'studentAdmission' => [
            'title' => 'Student Admission Tutorial',
            'description' => 'Learn how to register new students, manage admissions, and track student records.',
            'version' => '1.0.0',
            'required_permissions' => ['students.read', 'students.create'],
            'trigger_route' => '/students',
        ],
        'financeManagement' => [
            'title' => 'Finance Management Tutorial',
            'description' => 'Learn how to manage fees, payments, income, expenses, and financial reports.',
            'version' => '1.0.0',
            'required_permissions' => ['fees.read', 'fees.create', 'income.read', 'expenses.read'],
            'trigger_route' => '/finance',
        ],
        'attendanceTracking' => [
            'title' => 'Attendance Tracking Tutorial',
            'description' => 'Learn how to track daily attendance, manage sessions, and generate attendance reports.',
            'version' => '1.0.0',
            'required_permissions' => ['attendance.read', 'attendance.create'],
            'trigger_route' => '/attendance',
        ],
    ];

    /**
     * Assign tours to a user based on their permissions
     * 
     * @param string $userId
     * @param array $userPermissions Array of permission names the user has
     * @return array Array of assigned tour IDs
     */
    public function assignToursForUser(string $userId, array $userPermissions): array
    {
        $assignedTours = [];

        foreach ($this->tourDefinitions as $tourId => $tourDef) {
            // Check if user has all required permissions
            $hasAllPermissions = empty($tourDef['required_permissions']) || 
                count(array_intersect($tourDef['required_permissions'], $userPermissions)) === count($tourDef['required_permissions']);

            if (!$hasAllPermissions) {
                continue; // Skip this tour
            }

            // Check if tour already exists
            $existing = UserTour::where('user_id', $userId)
                ->where('tour_id', $tourId)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                $assignedTours[] = $tourId;
                continue; // Already assigned
            }

            // Create tour assignment
            try {
                UserTour::create([
                    'user_id' => $userId,
                    'tour_id' => $tourId,
                    'tour_version' => $tourDef['version'],
                    'tour_title' => $tourDef['title'],
                    'tour_description' => $tourDef['description'],
                    'assigned_by' => 'system',
                    'required_permissions' => $tourDef['required_permissions'],
                    'trigger_route' => $tourDef['trigger_route'],
                    'is_completed' => false,
                ]);

                $assignedTours[] = $tourId;
            } catch (\Exception $e) {
                Log::error("Failed to assign tour {$tourId} to user {$userId}: " . $e->getMessage());
            }
        }

        return $assignedTours;
    }

    /**
     * Get tours available for a user based on their permissions
     * 
     * @param array $userPermissions Array of permission names the user has
     * @return array Array of tour definitions the user is eligible for
     */
    public function getAvailableTours(array $userPermissions): array
    {
        $availableTours = [];

        foreach ($this->tourDefinitions as $tourId => $tourDef) {
            // Check if user has all required permissions
            $hasAllPermissions = empty($tourDef['required_permissions']) || 
                count(array_intersect($tourDef['required_permissions'], $userPermissions)) === count($tourDef['required_permissions']);

            if ($hasAllPermissions) {
                $availableTours[$tourId] = $tourDef;
            }
        }

        return $availableTours;
    }

    /**
     * Get tours that should trigger on a specific route
     * 
     * @param string $userId
     * @param string $route
     * @return array Array of UserTour models
     */
    public function getToursForRoute(string $userId, string $route): array
    {
        return UserTour::where('user_id', $userId)
            ->where('trigger_route', $route)
            ->where('is_completed', false)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'asc')
            ->get()
            ->toArray();
    }

    /**
     * Register a new tour definition
     * 
     * @param string $tourId
     * @param array $tourDef
     * @return void
     */
    public function registerTour(string $tourId, array $tourDef): void
    {
        $this->tourDefinitions[$tourId] = $tourDef;
    }

    /**
     * Get all tour definitions
     * 
     * @return array
     */
    public function getAllTourDefinitions(): array
    {
        return $this->tourDefinitions;
    }
}

