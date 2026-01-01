<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Carbon\Carbon;

class MaintenanceController extends Controller
{
    /**
     * Check if user has subscription admin permission
     */
    private function checkSubscriptionAdminPermission(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);

            return $user->hasPermissionTo('subscription.admin');
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Enforce subscription admin permission
     */
    private function enforceSubscriptionAdmin(Request $request): void
    {
        if (!$this->checkSubscriptionAdminPermission($request)) {
            abort(403, 'You do not have permission to access maintenance administration');
        }
    }

    /**
     * Get public maintenance mode status (no authentication required)
     */
    public function getPublicStatus(Request $request)
    {
        try {
            $maintenanceFilePath = storage_path('framework/down');
            $isDown = File::exists($maintenanceFilePath);

            $data = [
                'is_maintenance_mode' => $isDown,
                'message' => null,
                'scheduled_end_at' => null,
                'started_at' => null,
                'affected_services' => [],
            ];

            if ($isDown) {
                // Get active maintenance log
                $activeLog = MaintenanceLog::where('status', 'active')
                    ->orderBy('started_at', 'desc')
                    ->first();

                if ($activeLog) {
                    $data['message'] = $activeLog->message;
                    $data['scheduled_end_at'] = $activeLog->scheduled_end_at?->toDateTimeString();
                    $data['started_at'] = $activeLog->started_at->toDateTimeString();
                    $data['affected_services'] = $activeLog->affected_services ?? [];
                } else {
                    // Fallback to file content if no log exists
                    $content = json_decode(File::get($maintenanceFilePath), true);
                    $data['message'] = $content['message'] ?? 'System is under maintenance';
                    $data['scheduled_end_at'] = $content['scheduled_end'] ?? $content['scheduled_end_at'] ?? null;
                }
            }

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get public maintenance status failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get maintenance status',
            ], 500);
        }
    }

    /**
     * Get maintenance mode status (requires platform admin)
     */
    public function getStatus(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $maintenanceFilePath = storage_path('framework/down');
            $isDown = File::exists($maintenanceFilePath);

            $data = [
                'is_maintenance_mode' => $isDown,
                'message' => null,
                'scheduled_end_at' => null,
                'affected_services' => [],
                'current_log' => null,
            ];

            if ($isDown) {
                // Get active maintenance log
                $activeLog = MaintenanceLog::where('status', 'active')
                    ->orderBy('started_at', 'desc')
                    ->first();

                if ($activeLog) {
                    // Try to load startedBy relationship, but handle errors gracefully
                    try {
                        $activeLog->load(['startedBy:id,full_name,email']);
                    } catch (\Exception $e) {
                        // If relationship fails (e.g., invalid foreign key data), log and continue
                        \Log::warning('Failed to load startedBy relationship for maintenance log: ' . $e->getMessage());
                    }
                    
                    $data['message'] = $activeLog->message;
                    $data['scheduled_end_at'] = $activeLog->scheduled_end_at?->toDateTimeString();
                    $data['affected_services'] = $activeLog->affected_services ?? [];
                    $data['current_log'] = [
                        'id' => $activeLog->id,
                        'started_at' => $activeLog->started_at->toDateTimeString(),
                        'started_by' => $activeLog->startedBy ? [
                            'id' => $activeLog->startedBy->id,
                            'name' => $activeLog->startedBy->full_name,
                            'email' => $activeLog->startedBy->email,
                        ] : null,
                    ];
                } else {
                    // Fallback to file content if no log exists
                    $content = json_decode(File::get($maintenanceFilePath), true);
                    $data['message'] = $content['message'] ?? 'System is under maintenance';
                }
            }

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get maintenance status failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get maintenance status: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enable maintenance mode
     */
    public function enable(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $validated = $request->validate([
                'message' => 'nullable|string|max:500',
                'scheduled_end_at' => 'nullable|date|after:now',
                'affected_services' => 'nullable|array',
                'affected_services.*' => 'string|max:100',
            ]);

            $user = $request->user();
            $message = $validated['message'] ?? 'We are performing scheduled maintenance. We\'ll be back soon!';
            $scheduledEndAt = isset($validated['scheduled_end_at'])
                ? Carbon::parse($validated['scheduled_end_at'])
                : null;
            $affectedServices = $validated['affected_services'] ?? [];

            // Create maintenance log
            $log = MaintenanceLog::create([
                'message' => $message,
                'affected_services' => $affectedServices,
                'started_at' => Carbon::now(),
                'scheduled_end_at' => $scheduledEndAt,
                'started_by' => $user->id,
                'status' => 'active',
            ]);

            // Build maintenance file payload
            $payload = [
                'time' => time(),
                'message' => $message,
                'retry' => 60, // Retry after 60 seconds
            ];

            if ($scheduledEndAt) {
                $payload['scheduled_end'] = $scheduledEndAt->toDateTimeString();
            }

            if (!empty($affectedServices)) {
                $payload['affected_services'] = $affectedServices;
            }

            $payload['log_id'] = $log->id;

            // Write maintenance file
            $maintenanceFilePath = storage_path('framework/down');
            File::put($maintenanceFilePath, json_encode($payload, JSON_PRETTY_PRINT));

            return response()->json([
                'success' => true,
                'message' => 'Maintenance mode enabled successfully',
                'log_id' => $log->id,
            ]);
        } catch (\Exception $e) {
            \Log::error('Enable maintenance mode failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to enable maintenance mode: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Disable maintenance mode
     */
    public function disable(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $user = $request->user();

            // Get active maintenance log
            $activeLog = MaintenanceLog::where('status', 'active')
                ->orderBy('started_at', 'desc')
                ->first();

            if ($activeLog) {
                $activeLog->update([
                    'actual_end_at' => Carbon::now(),
                    'ended_by' => $user->id,
                    'status' => 'completed',
                ]);
            }

            // Remove maintenance file
            $maintenanceFilePath = storage_path('framework/down');
            if (File::exists($maintenanceFilePath)) {
                File::delete($maintenanceFilePath);
            }

            return response()->json([
                'success' => true,
                'message' => 'Maintenance mode disabled successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Disable maintenance mode failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to disable maintenance mode: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get maintenance history
     */
    public function history(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            // Load relationships separately to handle errors gracefully
            $logs = MaintenanceLog::orderBy('started_at', 'desc')
                ->limit(50)
                ->get()
                ->map(function ($log) {
                    // Try to load relationships, but handle errors gracefully
                    try {
                        $log->load(['startedBy:id,full_name,email', 'endedBy:id,full_name,email']);
                    } catch (\Exception $e) {
                        // If relationship fails (e.g., invalid foreign key data), log and continue
                        \Log::warning('Failed to load relationships for maintenance log ' . $log->id . ': ' . $e->getMessage());
                    }
                    
                    return [
                        'id' => $log->id,
                        'message' => $log->message,
                        'affected_services' => $log->affected_services,
                        'started_at' => $log->started_at->toDateTimeString(),
                        'scheduled_end_at' => $log->scheduled_end_at?->toDateTimeString(),
                        'actual_end_at' => $log->actual_end_at?->toDateTimeString(),
                        'duration_minutes' => $log->actual_end_at
                            ? $log->started_at->diffInMinutes($log->actual_end_at)
                            : null,
                        'status' => $log->status,
                        'started_by' => $log->startedBy ? [
                            'name' => $log->startedBy->full_name,
                            'email' => $log->startedBy->email,
                        ] : null,
                        'ended_by' => $log->endedBy ? [
                            'name' => $log->endedBy->full_name,
                            'email' => $log->endedBy->email,
                        ] : null,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $logs,
            ]);
        } catch (\Exception $e) {
            \Log::error('Get maintenance history failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get maintenance history: ' . $e->getMessage(),
            ], 500);
        }
    }
}
