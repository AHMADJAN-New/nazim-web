<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\Currency;
use App\Models\Donor;
use App\Models\ExchangeRate;
use App\Models\FinanceAccount;
use App\Models\FinanceProject;
use App\Models\IncomeCategory;
use App\Models\IncomeEntry;
use App\Models\OrgFacility;
use Illuminate\Http\Request;

class OrgFinanceIncomeEntryController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'income_category_id' => 'nullable|uuid|exists:income_categories,id',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'facility_id' => 'nullable|uuid|exists:org_facilities,id',
            'donor_id' => 'nullable|uuid|exists:donors,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'search' => 'nullable|string|max:255',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = IncomeEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with(['account', 'incomeCategory', 'project', 'facility', 'donor', 'receivedBy', 'currency']);

        if (! empty($validated['account_id'])) {
            $query->where('account_id', $validated['account_id']);
        }
        if (! empty($validated['income_category_id'])) {
            $query->where('income_category_id', $validated['income_category_id']);
        }
        if (! empty($validated['project_id'])) {
            $query->where('project_id', $validated['project_id']);
        }
        if (! empty($validated['facility_id'])) {
            $query->where('facility_id', $validated['facility_id']);
        }
        if (! empty($validated['donor_id'])) {
            $query->where('donor_id', $validated['donor_id']);
        }
        if (! empty($validated['date_from'])) {
            $query->where('date', '>=', $validated['date_from']);
        }
        if (! empty($validated['date_to'])) {
            $query->where('date', '<=', $validated['date_to']);
        }
        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        $query->orderBy('date', 'desc')->orderBy('created_at', 'desc');

        $perPage = $validated['per_page'] ?? 25;
        $entries = isset($validated['page']) ? $query->paginate($perPage) : $query->get();

        return response()->json($entries);
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $validated = $request->validate([
            'account_id' => 'required|uuid|exists:finance_accounts,id',
            'income_category_id' => 'required|uuid|exists:income_categories,id',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'facility_id' => 'nullable|uuid|exists:org_facilities,id',
            'donor_id' => 'nullable|uuid|exists:donors,id',
            'reference_no' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
        ]);

        $account = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['account_id']);
        if (! $account) {
            return response()->json(['error' => 'Invalid account - must be org-level'], 400);
        }

        $category = IncomeCategory::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['income_category_id']);
        if (! $category) {
            return response()->json(['error' => 'Invalid income category - must be org-level'], 400);
        }

        $currencyId = $validated['currency_id'] ?? $account->currency_id;
        if (! $currencyId) {
            $base = Currency::where('organization_id', $orgId)->whereNull('school_id')->where('is_base', true)->where('is_active', true)->whereNull('deleted_at')->first();
            $currencyId = $base?->id;
        }
        if (! $currencyId) {
            return response()->json(['error' => 'Currency is required. Configure a base currency for org finance.'], 400);
        }

        $currency = Currency::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($currencyId);
        if (! $currency) {
            return response()->json(['error' => 'Invalid currency'], 400);
        }

        if ($account->currency_id && $currencyId !== $account->currency_id) {
            $rate = ExchangeRate::getRate($orgId, null, $currencyId, $account->currency_id, $validated['date']);
            if ($rate === null) {
                return response()->json(['error' => 'Exchange rate not found for entry date'], 422);
            }
        }

        if (! empty($validated['project_id'])) {
            $project = FinanceProject::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['project_id']);
            if (! $project) {
                return response()->json(['error' => 'Invalid project - must be org-level'], 400);
            }
        }

        if (! empty($validated['donor_id'])) {
            $donor = Donor::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['donor_id']);
            if (! $donor) {
                return response()->json(['error' => 'Invalid donor - must be org-level'], 400);
            }
        }

        if (! empty($validated['facility_id'])) {
            $facility = OrgFacility::whereNull('deleted_at')->where('organization_id', $orgId)->find($validated['facility_id']);
            if (! $facility) {
                return response()->json(['error' => 'Invalid facility'], 400);
            }
        }

        $entry = IncomeEntry::create([
            'organization_id' => $orgId,
            'school_id' => null,
            'currency_id' => $currencyId,
            'account_id' => $validated['account_id'],
            'income_category_id' => $validated['income_category_id'],
            'project_id' => $validated['project_id'] ?? null,
            'facility_id' => $validated['facility_id'] ?? null,
            'donor_id' => $validated['donor_id'] ?? null,
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'reference_no' => $validated['reference_no'] ?? null,
            'description' => $validated['description'] ?? null,
            'received_by_user_id' => $request->user()->id,
            'payment_method' => $validated['payment_method'] ?? 'cash',
        ]);

        $entry->load(['account', 'incomeCategory', 'project', 'donor', 'receivedBy', 'currency']);

        return response()->json($entry, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $entry = IncomeEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with(['account', 'incomeCategory', 'project', 'donor', 'receivedBy', 'currency'])
            ->find($id);

        if (! $entry) {
            return response()->json(['error' => 'Income entry not found'], 404);
        }

        return response()->json($entry);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $entry = IncomeEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (! $entry) {
            return response()->json(['error' => 'Income entry not found'], 404);
        }

        $validated = $request->validate([
            'account_id' => 'sometimes|uuid|exists:finance_accounts,id',
            'income_category_id' => 'sometimes|uuid|exists:income_categories,id',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'amount' => 'sometimes|numeric|min:0.01',
            'date' => 'sometimes|date',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'facility_id' => 'nullable|uuid|exists:org_facilities,id',
            'donor_id' => 'nullable|uuid|exists:donors,id',
            'reference_no' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
        ]);

        if (! empty($validated['account_id'])) {
            $account = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['account_id']);
            if (! $account) {
                return response()->json(['error' => 'Invalid account - must be org-level'], 400);
            }
        }
        if (! empty($validated['income_category_id'])) {
            $cat = IncomeCategory::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['income_category_id']);
            if (! $cat) {
                return response()->json(['error' => 'Invalid income category - must be org-level'], 400);
            }
        }
        if (array_key_exists('facility_id', $validated) && $validated['facility_id'] !== null && $validated['facility_id'] !== '') {
            $facility = OrgFacility::whereNull('deleted_at')->where('organization_id', $orgId)->find($validated['facility_id']);
            if (! $facility) {
                return response()->json(['error' => 'Invalid facility'], 400);
            }
        }

        $entry->update($validated);
        $entry->load(['account', 'incomeCategory', 'project', 'donor', 'receivedBy', 'currency']);

        return response()->json($entry);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $entry = IncomeEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (! $entry) {
            return response()->json(['error' => 'Income entry not found'], 404);
        }

        $entry->delete();

        return response()->noContent();
    }
}
