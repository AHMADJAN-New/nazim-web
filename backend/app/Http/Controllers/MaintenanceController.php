<?php

namespace App\Http\Controllers;

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
     * Get maintenance mode status
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
                'retry_after' => null,
                'refresh_after' => null,
            ];

            if ($isDown) {
                $content = json_decode(File::get($maintenanceFilePath), true);
                $data['message'] = $content['message'] ?? 'System is under maintenance';
                $data['retry_after'] = $content['retry'] ?? null;
                $data['refresh_after'] = $content['refresh'] ?? null;
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
                'retry_after' => 'nullable|integer|min:0',
                'refresh_after' => 'nullable|integer|min:0',
            ]);

            $options = [];

            if (!empty($validated['message'])) {
                $options['message'] = $validated['message'];
            }

            if (isset($validated['retry_after'])) {
                $options['retry'] = $validated['retry_after'];
            }

            if (isset($validated['refresh_after'])) {
                $options['refresh'] = $validated['refresh_after'];
            }

            // Put application in maintenance mode
            Artisan::call('down', $options);

            return response()->json([
                'success' => true,
                'message' => 'Maintenance mode enabled successfully',
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
            // Bring application back up
            Artisan::call('up');

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
}
