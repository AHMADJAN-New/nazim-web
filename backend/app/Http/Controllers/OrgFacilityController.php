<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\FinanceAccount;
use App\Models\OrgFacility;
use Illuminate\Http\Request;

class OrgFacilityController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'facility_type_id' => 'nullable|uuid|exists:facility_types,id',
            'is_active' => 'nullable|boolean',
        ]);

        $query = OrgFacility::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->withCount('facilityStaff')
            ->with(['facilityType', 'financeAccount', 'school']);

        if (isset($validated['facility_type_id'])) {
            $query->where('facility_type_id', $validated['facility_type_id']);
        }
        if (isset($validated['is_active'])) {
            $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $facilities = $query->orderBy('name')->get();

        return response()->json($facilities);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $facility = OrgFacility::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->with(['facilityType', 'financeAccount', 'school', 'facilityStaff.staff', 'facilityMaintenance', 'facilityDocuments'])
            ->find($id);

        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        return response()->json($facility);
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $validated = $request->validate([
            'facility_type_id' => 'nullable|uuid|exists:facility_types,id',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'area_sqm' => 'nullable|numeric|min:0',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'landmark' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'finance_account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'is_active' => 'nullable|boolean',
        ]);

        if (! empty($validated['facility_type_id'])) {
            $type = \App\Models\FacilityType::whereNull('deleted_at')->where('organization_id', $orgId)->find($validated['facility_type_id']);
            if (! $type) {
                return response()->json(['error' => 'Invalid facility type'], 400);
            }
        }

        if (! empty($validated['finance_account_id'])) {
            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->whereNull('school_id')
                ->find($validated['finance_account_id']);
            if (! $account) {
                return response()->json(['error' => 'Invalid account - must be org-level'], 400);
            }
        }

        $facility = OrgFacility::create([
            'organization_id' => $orgId,
            'facility_type_id' => $validated['facility_type_id'] ?? null,
            'name' => trim($validated['name']),
            'address' => $validated['address'] ?? null,
            'area_sqm' => $validated['area_sqm'] ?? null,
            'city' => $validated['city'] ?? null,
            'district' => $validated['district'] ?? null,
            'landmark' => $validated['landmark'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'finance_account_id' => $validated['finance_account_id'] ?? null,
            'school_id' => $validated['school_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $facility->load(['facilityType', 'financeAccount', 'school']);

        return response()->json($facility, 201);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $facility = OrgFacility::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($id);

        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $validated = $request->validate([
            'facility_type_id' => 'nullable|uuid|exists:facility_types,id',
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'area_sqm' => 'nullable|numeric|min:0',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'landmark' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'finance_account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['facility_type_id']) && $validated['facility_type_id']) {
            $type = \App\Models\FacilityType::whereNull('deleted_at')->where('organization_id', $orgId)->find($validated['facility_type_id']);
            if (! $type) {
                return response()->json(['error' => 'Invalid facility type'], 400);
            }
        }

        if (array_key_exists('finance_account_id', $validated) && $validated['finance_account_id']) {
            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->whereNull('school_id')
                ->find($validated['finance_account_id']);
            if (! $account) {
                return response()->json(['error' => 'Invalid account - must be org-level'], 400);
            }
        }

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $facility->update($validated);
        $facility->load(['facilityType', 'financeAccount', 'school']);

        return response()->json($facility);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $facility = OrgFacility::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($id);

        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $facility->delete();

        return response()->noContent();
    }
}
