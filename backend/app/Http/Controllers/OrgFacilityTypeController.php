<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\FacilityType;
use Illuminate\Http\Request;

class OrgFacilityTypeController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $types = FacilityType::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();

        return response()->json($types);
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $type = FacilityType::create([
            'organization_id' => $orgId,
            'name' => trim($validated['name']),
            'code' => $validated['code'] ?? null,
            'display_order' => $validated['display_order'] ?? 0,
        ]);

        return response()->json($type, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $type = FacilityType::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($id);

        if (! $type) {
            return response()->json(['error' => 'Facility type not found'], 404);
        }

        return response()->json($type);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $type = FacilityType::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($id);

        if (! $type) {
            return response()->json(['error' => 'Facility type not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50',
            'display_order' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $type->update($validated);

        return response()->json($type);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $type = FacilityType::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($id);

        if (! $type) {
            return response()->json(['error' => 'Facility type not found'], 404);
        }

        $inUse = $type->facilities()->whereNull('deleted_at')->exists();
        if ($inUse) {
            return response()->json(['error' => 'Cannot delete facility type that is in use'], 409);
        }

        $type->delete();

        return response()->noContent();
    }
}
