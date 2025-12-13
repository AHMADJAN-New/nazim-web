<?php

namespace App\Http\Controllers;

use App\Models\Donor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DonorController extends Controller
{
    /**
     * Display a listing of donors
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_donors.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_donors.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'type' => 'nullable|in:individual,organization',
                'is_active' => 'nullable|boolean',
                'search' => 'nullable|string|max:255',
            ]);

            $query = Donor::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            if (!empty($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            if (!empty($validated['search'])) {
                $search = $validated['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                      ->orWhere('phone', 'ILIKE', "%{$search}%")
                      ->orWhere('email', 'ILIKE', "%{$search}%");
                });
            }

            $donors = $query->orderBy('name')->get();

            return response()->json($donors);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('DonorController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching donors'], 500);
        }
    }

    /**
     * Store a newly created donor
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_donors.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'phone' => 'nullable|string|max:50',
                'email' => 'nullable|email|max:255',
                'address' => 'nullable|string',
                'type' => 'nullable|in:individual,organization',
                'contact_person' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            $donor = Donor::create([
                'organization_id' => $profile->organization_id,
                'name' => trim($validated['name']),
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'address' => $validated['address'] ?? null,
                'type' => $validated['type'] ?? 'individual',
                'contact_person' => $validated['contact_person'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            return response()->json($donor, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('DonorController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating donor'], 500);
        }
    }

    /**
     * Display the specified donor
     */
    public function show(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_donors.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $donor = Donor::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$donor) {
                return response()->json(['error' => 'Donor not found'], 404);
            }

            return response()->json($donor);
        } catch (\Exception $e) {
            \Log::error('DonorController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching donor'], 500);
        }
    }

    /**
     * Update the specified donor
     */
    public function update(Request $request, string $id)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_donors.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $donor = Donor::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$donor) {
                return response()->json(['error' => 'Donor not found'], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'phone' => 'nullable|string|max:50',
                'email' => 'nullable|email|max:255',
                'address' => 'nullable|string',
                'type' => 'nullable|in:individual,organization',
                'contact_person' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            $donor->update($validated);

            return response()->json($donor);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('DonorController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating donor'], 500);
        }
    }

    /**
     * Remove the specified donor (soft delete)
     */
    public function destroy(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_donors.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $donor = Donor::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$donor) {
                return response()->json(['error' => 'Donor not found'], 404);
            }

            // Check if donor has any donations
            $hasDonations = $donor->incomeEntries()->whereNull('deleted_at')->exists();
            if ($hasDonations) {
                return response()->json(['error' => 'Cannot delete donor with existing donations'], 409);
            }

            $donor->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('DonorController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting donor'], 500);
        }
    }

    /**
     * Get donor summary with donation history
     */
    public function summary(Request $request, string $id)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_donors.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
            ]);

            $donor = Donor::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$donor) {
                return response()->json(['error' => 'Donor not found'], 404);
            }

            // Recalculate total donated
            $donor->recalculateTotalDonated();

            // Get donations for period if specified
            $periodTotal = null;
            if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
                $periodTotal = $donor->getDonationsForPeriod($validated['start_date'], $validated['end_date']);
            }

            // Get recent donations
            $recentDonations = $donor->incomeEntries()
                ->whereNull('deleted_at')
                ->with(['incomeCategory', 'project'])
                ->orderBy('date', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'donor' => $donor,
                'summary' => [
                    'total_donated' => $donor->total_donated,
                    'period_total' => $periodTotal,
                    'donation_count' => $donor->incomeEntries()->whereNull('deleted_at')->count(),
                ],
                'recent_donations' => $recentDonations,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('DonorController@summary error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching donor summary'], 500);
        }
    }
}
