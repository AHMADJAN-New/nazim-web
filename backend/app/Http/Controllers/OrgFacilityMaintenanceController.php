<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\ExpenseEntry;
use App\Models\FacilityMaintenance;
use App\Models\OrgFacility;
use Illuminate\Http\Request;

class OrgFacilityMaintenanceController extends Controller
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

        $maintenance = FacilityMaintenance::whereNull('deleted_at')
            ->where('facility_id', $facilityId)
            ->with(['currency', 'expenseEntry'])
            ->orderBy('maintained_at', 'desc')
            ->get();

        return response()->json($maintenance);
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
            'maintained_at' => 'required|date',
            'description' => 'nullable|string',
            'status' => 'nullable|string|max:50',
            'cost_amount' => 'nullable|numeric|min:0',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'expense_entry_id' => 'nullable|uuid|exists:expense_entries,id',
        ]);

        if (! empty($validated['expense_entry_id'])) {
            $expense = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('facility_id', $facilityId)
                ->find($validated['expense_entry_id']);
            if (! $expense) {
                return response()->json(['error' => 'Expense entry not found or not linked to this facility'], 400);
            }
        }

        $maintenance = FacilityMaintenance::create([
            'facility_id' => $facilityId,
            'maintained_at' => $validated['maintained_at'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'pending',
            'cost_amount' => $validated['cost_amount'] ?? null,
            'currency_id' => $validated['currency_id'] ?? null,
            'expense_entry_id' => $validated['expense_entry_id'] ?? null,
        ]);

        $maintenance->load(['currency', 'expenseEntry']);

        return response()->json($maintenance, 201);
    }

    public function update(Request $request, string $facilityId, string $id)
    {
        $this->requireOrgFinanceCreate($request);

        $facility = $this->getFacilityForOrg($request, $facilityId);
        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $orgId = $this->getOrgIdFromProfile($request);

        $maintenance = FacilityMaintenance::whereNull('deleted_at')
            ->where('facility_id', $facilityId)
            ->find($id);

        if (! $maintenance) {
            return response()->json(['error' => 'Maintenance record not found'], 404);
        }

        $validated = $request->validate([
            'maintained_at' => 'sometimes|date',
            'description' => 'nullable|string',
            'status' => 'nullable|string|max:50',
            'cost_amount' => 'nullable|numeric|min:0',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'expense_entry_id' => 'nullable|uuid|exists:expense_entries,id',
        ]);

        if (array_key_exists('expense_entry_id', $validated) && $validated['expense_entry_id']) {
            $expense = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('facility_id', $facilityId)
                ->find($validated['expense_entry_id']);
            if (! $expense) {
                return response()->json(['error' => 'Expense entry not found or not linked to this facility'], 400);
            }
        }

        $maintenance->update($validated);
        $maintenance->load(['currency', 'expenseEntry']);

        return response()->json($maintenance);
    }

    public function destroy(Request $request, string $facilityId, string $id)
    {
        $this->requireOrgFinanceCreate($request);

        $facility = $this->getFacilityForOrg($request, $facilityId);
        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $maintenance = FacilityMaintenance::whereNull('deleted_at')
            ->where('facility_id', $facilityId)
            ->find($id);

        if (! $maintenance) {
            return response()->json(['error' => 'Maintenance record not found'], 404);
        }

        $maintenance->delete();

        return response()->noContent();
    }
}
