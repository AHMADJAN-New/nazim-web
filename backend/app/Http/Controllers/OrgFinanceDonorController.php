<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\Donor;
use Illuminate\Http\Request;

class OrgFinanceDonorController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'type' => 'nullable|in:individual,organization',
            'is_active' => 'nullable|boolean',
            'search' => 'nullable|string|max:255',
        ]);

        $query = Donor::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id');

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
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

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
            'organization_id' => $orgId,
            'school_id' => null,
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
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $donor = Donor::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$donor) {
            return response()->json(['error' => 'Donor not found'], 404);
        }

        return response()->json($donor);
    }

    public function summary(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $donor = Donor::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$donor) {
            return response()->json(['error' => 'Donor not found'], 404);
        }

        $donor->recalculateTotalDonated();

        $periodTotal = null;
        if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
            $periodTotal = $donor->getDonationsForPeriod($validated['start_date'], $validated['end_date']);
        }

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
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $donor = Donor::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
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
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $donor = Donor::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$donor) {
            return response()->json(['error' => 'Donor not found'], 404);
        }

        $donor->delete();
        return response()->noContent();
    }
}
