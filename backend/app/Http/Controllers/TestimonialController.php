<?php

namespace App\Http\Controllers;

use App\Models\Testimonial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class TestimonialController extends Controller
{
    /**
     * Get all active testimonials (public endpoint for landing page)
     */
    public function index(Request $request)
    {
        $testimonials = Testimonial::active()
            ->ordered()
            ->get();

        return response()->json([
            'data' => $testimonials->map(function ($testimonial) {
                return [
                    'id' => $testimonial->id,
                    'name' => $testimonial->name,
                    'role' => $testimonial->role,
                    'organization' => $testimonial->organization,
                    'content' => $testimonial->content,
                    'image_url' => $testimonial->image_url,
                    'rating' => $testimonial->rating,
                ];
            }),
        ]);
    }

    /**
     * Get all testimonials (admin endpoint - includes inactive)
     */
    public function adminIndex(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in adminIndex: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $testimonials = Testimonial::withTrashed()
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $testimonials->map(function ($testimonial) {
                return [
                    'id' => $testimonial->id,
                    'name' => $testimonial->name,
                    'role' => $testimonial->role,
                    'organization' => $testimonial->organization,
                    'content' => $testimonial->content,
                    'image_url' => $testimonial->image_url,
                    'rating' => $testimonial->rating,
                    'sort_order' => $testimonial->sort_order,
                    'is_active' => $testimonial->is_active,
                    'created_at' => $testimonial->created_at->toISOString(),
                    'updated_at' => $testimonial->updated_at->toISOString(),
                    'deleted_at' => $testimonial->deleted_at?->toISOString(),
                ];
            }),
        ]);
    }

    /**
     * Create a new testimonial
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in store: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'organization' => 'nullable|string|max:255',
            'content' => 'required|string',
            'image_url' => 'nullable|string|max:500|url',
            'rating' => 'nullable|integer|min:1|max:5',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $testimonial = Testimonial::create([
            'name' => $validated['name'],
            'role' => $validated['role'],
            'organization' => $validated['organization'] ?? null,
            'content' => $validated['content'],
            'image_url' => $validated['image_url'] ?? null,
            'rating' => $validated['rating'] ?? 5,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'data' => [
                'id' => $testimonial->id,
                'name' => $testimonial->name,
                'role' => $testimonial->role,
                'organization' => $testimonial->organization,
                'content' => $testimonial->content,
                'image_url' => $testimonial->image_url,
                'rating' => $testimonial->rating,
                'sort_order' => $testimonial->sort_order,
                'is_active' => $testimonial->is_active,
                'created_at' => $testimonial->created_at->toISOString(),
                'updated_at' => $testimonial->updated_at->toISOString(),
            ],
        ], 201);
    }

    /**
     * Update a testimonial
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in update: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $testimonial = Testimonial::withTrashed()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'role' => 'sometimes|required|string|max:255',
            'organization' => 'nullable|string|max:255',
            'content' => 'sometimes|required|string',
            'image_url' => 'nullable|string|max:500|url',
            'rating' => 'nullable|integer|min:1|max:5',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $testimonial->update($validated);

        return response()->json([
            'data' => [
                'id' => $testimonial->id,
                'name' => $testimonial->name,
                'role' => $testimonial->role,
                'organization' => $testimonial->organization,
                'content' => $testimonial->content,
                'image_url' => $testimonial->image_url,
                'rating' => $testimonial->rating,
                'sort_order' => $testimonial->sort_order,
                'is_active' => $testimonial->is_active,
                'created_at' => $testimonial->created_at->toISOString(),
                'updated_at' => $testimonial->updated_at->toISOString(),
                'deleted_at' => $testimonial->deleted_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Delete a testimonial (soft delete)
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in destroy: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $testimonial = Testimonial::withTrashed()->findOrFail($id);
        $testimonial->delete();

        return response()->noContent();
    }
}
