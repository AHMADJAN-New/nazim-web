<?php

namespace App\Http\Controllers;

use App\Models\UserTour;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserTourController extends Controller
{
    /**
     * Display a listing of user tours
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Users can only see their own tours
        $tours = UserTour::where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tours);
    }

    /**
     * Get tours for current user
     */
    public function myTours(Request $request)
    {
        $user = $request->user();
        
        $tours = UserTour::where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tours);
    }

    /**
     * Get tours for a specific route (for route-based triggering)
     */
    public function toursForRoute(Request $request)
    {
        $user = $request->user();
        $route = $request->input('route');

        if (!$route) {
            return response()->json(['error' => 'Route parameter is required'], 400);
        }

        // Get tours assigned to this user that trigger on this route
        $tours = UserTour::where('user_id', $user->id)
            ->where('trigger_route', $route)
            ->where('is_completed', false)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($tours);
    }

    /**
     * Store a newly created user tour
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $validated = $request->validate([
            'tour_id' => 'required|string|max:100',
            'tour_version' => 'nullable|string|max:50',
            'tour_title' => 'nullable|string|max:255',
            'tour_description' => 'nullable|string',
            'assigned_by' => 'nullable|string|max:50',
            'required_permissions' => 'nullable|array',
            'trigger_route' => 'nullable|string|max:255',
        ]);

        // Check if tour already exists for this user
        $existing = UserTour::where('user_id', $user->id)
            ->where('tour_id', $validated['tour_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json($existing, 200);
        }

        $tour = UserTour::create([
            'user_id' => $user->id,
            'tour_id' => $validated['tour_id'],
            'tour_version' => $validated['tour_version'] ?? '1.0.0',
            'tour_title' => $validated['tour_title'] ?? null,
            'tour_description' => $validated['tour_description'] ?? null,
            'assigned_by' => $validated['assigned_by'] ?? 'system',
            'required_permissions' => $validated['required_permissions'] ?? null,
            'trigger_route' => $validated['trigger_route'] ?? null,
            'is_completed' => false,
        ]);

        return response()->json($tour, 201);
    }

    /**
     * Display the specified user tour
     */
    public function show(string $id)
    {
        $user = request()->user();

        $tour = UserTour::where('id', $id)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$tour) {
            return response()->json(['error' => 'Tour not found'], 404);
        }

        return response()->json($tour);
    }

    /**
     * Update the specified user tour
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $tour = UserTour::where('id', $id)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$tour) {
            return response()->json(['error' => 'Tour not found'], 404);
        }

        $validated = $request->validate([
            'is_completed' => 'nullable|boolean',
            'last_step_id' => 'nullable|string|max:100',
            'last_step_index' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['is_completed']) && $validated['is_completed'] && !$tour->is_completed) {
            $validated['completed_at'] = now();
        }

        $tour->update($validated);

        return response()->json($tour);
    }

    /**
     * Mark a tour as completed
     */
    public function complete(Request $request, string $id)
    {
        $user = $request->user();

        $tour = UserTour::where('id', $id)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$tour) {
            return response()->json(['error' => 'Tour not found'], 404);
        }

        $tour->update([
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        return response()->json($tour);
    }

    /**
     * Save progress for a tour
     */
    public function saveProgress(Request $request, string $id)
    {
        $user = $request->user();

        $tour = UserTour::where('id', $id)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$tour) {
            return response()->json(['error' => 'Tour not found'], 404);
        }

        $validated = $request->validate([
            'last_step_id' => 'required|string|max:100',
            'last_step_index' => 'required|integer|min:0',
        ]);

        $tour->update($validated);

        return response()->json($tour);
    }

    /**
     * Remove the specified user tour
     */
    public function destroy(string $id)
    {
        $user = request()->user();

        $tour = UserTour::where('id', $id)
            ->where('user_id', $user->id)
            ->whereNull('deleted_at')
            ->first();

        if (!$tour) {
            return response()->json(['error' => 'Tour not found'], 404);
        }

        $tour->delete();

        return response()->noContent();
    }
}
