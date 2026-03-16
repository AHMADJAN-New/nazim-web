<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\FacilityStaff;
use App\Models\OrgFacility;
use App\Models\Staff;
use Illuminate\Http\Request;

class OrgFacilityStaffController extends Controller
{
    use OrgFinanceScope;

    protected function getFacilityForOrg(Request $request, string $facilityId): ?OrgFacility
    {
        $orgId = $this->getOrgIdFromProfile($request);

        return OrgFacility::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($facilityId);
    }

    public function index(Request $request, string $facilityId)
    {
        $this->requireOrgFinanceRead($request);

        $facility = $this->getFacilityForOrg($request, $facilityId);
        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $staff = FacilityStaff::whereNull('deleted_at')
            ->where('facility_id', $facilityId)
            ->with('staff')
            ->orderBy('role')
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json($staff);
    }

    public function store(Request $request, string $facilityId)
    {
        $this->requireOrgFinanceCreate($request);

        $facility = $this->getFacilityForOrg($request, $facilityId);
        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $orgId = $this->getOrgIdFromProfile($request);

        $validated = $request->validate([
            'role' => 'required|string|max:100',
            'staff_id' => 'nullable|uuid|exists:staff,id',
            'display_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        if (! empty($validated['staff_id'])) {
            $staff = Staff::whereNull('deleted_at')->where('organization_id', $orgId)->find($validated['staff_id']);
            if (! $staff) {
                return response()->json(['error' => 'Invalid staff - must belong to organization'], 400);
            }
        }

        $facilityStaff = FacilityStaff::create([
            'facility_id' => $facilityId,
            'role' => trim($validated['role']),
            'staff_id' => $validated['staff_id'] ?? null,
            'display_name' => $validated['display_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
        ]);

        $facilityStaff->load('staff');

        return response()->json($facilityStaff, 201);
    }

    public function update(Request $request, string $facilityId, string $id)
    {
        $this->requireOrgFinanceCreate($request);

        $facility = $this->getFacilityForOrg($request, $facilityId);
        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $orgId = $this->getOrgIdFromProfile($request);

        $facilityStaff = FacilityStaff::whereNull('deleted_at')
            ->where('facility_id', $facilityId)
            ->find($id);

        if (! $facilityStaff) {
            return response()->json(['error' => 'Facility staff record not found'], 404);
        }

        $validated = $request->validate([
            'role' => 'sometimes|string|max:100',
            'staff_id' => 'nullable|uuid|exists:staff,id',
            'display_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        if (array_key_exists('staff_id', $validated) && $validated['staff_id']) {
            $staff = Staff::whereNull('deleted_at')->where('organization_id', $orgId)->find($validated['staff_id']);
            if (! $staff) {
                return response()->json(['error' => 'Invalid staff - must belong to organization'], 400);
            }
        }

        if (isset($validated['role'])) {
            $validated['role'] = trim($validated['role']);
        }

        $facilityStaff->update($validated);
        $facilityStaff->load('staff');

        return response()->json($facilityStaff);
    }

    public function destroy(Request $request, string $facilityId, string $id)
    {
        $this->requireOrgFinanceCreate($request);

        $facility = $this->getFacilityForOrg($request, $facilityId);
        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $facilityStaff = FacilityStaff::whereNull('deleted_at')
            ->where('facility_id', $facilityId)
            ->find($id);

        if (! $facilityStaff) {
            return response()->json(['error' => 'Facility staff record not found'], 404);
        }

        $facilityStaff->delete();

        return response()->noContent();
    }
}
