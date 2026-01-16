<?php

namespace App\Http\Controllers;

use App\Models\LandingContact;
use App\Models\LandingPlanRequest;
use Illuminate\Http\Request;

class LandingController extends Controller
{
    public function submitContact(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'school_name' => 'nullable|string|max:255',
            'student_count' => 'nullable|integer|min:0',
            'message' => 'nullable|string|max:2000',
        ]);

        $contact = LandingContact::create($validated);

        return response()->json([
            'data' => [
                'id' => $contact->id,
            ],
        ]);
    }

    public function submitPlanRequest(Request $request)
    {
        $validated = $request->validate([
            'requested_plan_id' => 'nullable|uuid|exists:subscription_plans,id',
            'organization_name' => 'required|string|max:255',
            'school_name' => 'required|string|max:255',
            'school_page_url' => 'nullable|url|max:500',
            'contact_name' => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'contact_whatsapp' => 'nullable|string|max:50',
            'contact_position' => 'nullable|string|max:100',
            'number_of_schools' => 'nullable|integer|min:1',
            'student_count' => 'nullable|integer|min:0',
            'staff_count' => 'nullable|integer|min:0',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'message' => 'nullable|string|max:2000',
        ]);

        $requestEntry = LandingPlanRequest::create($validated);

        return response()->json([
            'data' => [
                'id' => $requestEntry->id,
            ],
        ]);
    }

    /**
     * List all plan requests (platform admin endpoint)
     */
    public function listPlanRequests(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        // Note: The platform.admin middleware already checks this, but we verify again for safety
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            // This matches the EnsurePlatformAdmin middleware behavior
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for subscription.admin in listPlanRequests: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $search = $request->query('search');
        $perPage = $request->query('per_page', 20);
        $page = $request->query('page', 1);

        $query = LandingPlanRequest::with('requestedPlan:id,name,slug')
            ->orderBy('created_at', 'desc');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('organization_name', 'ilike', "%{$search}%")
                  ->orWhere('school_name', 'ilike', "%{$search}%")
                  ->orWhere('contact_name', 'ilike', "%{$search}%")
                  ->orWhere('contact_email', 'ilike', "%{$search}%")
                  ->orWhere('contact_phone', 'ilike', "%{$search}%")
                  ->orWhere('message', 'ilike', "%{$search}%");
            });
        }

        $requests = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $requests->items(),
            'pagination' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    /**
     * Get a single plan request (platform admin endpoint)
     */
    public function getPlanRequest(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        // Note: The platform.admin middleware already checks this, but we verify again for safety
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            // This matches the EnsurePlatformAdmin middleware behavior
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for subscription.admin in getPlanRequest: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $planRequest = LandingPlanRequest::with('requestedPlan:id,name,slug')->find($id);

        if (!$planRequest) {
            return response()->json(['error' => 'Plan request not found'], 404);
        }

        return response()->json([
            'data' => $planRequest,
        ]);
    }
}
