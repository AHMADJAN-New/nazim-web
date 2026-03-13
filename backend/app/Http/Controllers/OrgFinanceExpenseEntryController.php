<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\Currency;
use App\Models\ExchangeRate;
use App\Models\ExpenseCategory;
use App\Models\ExpenseEntry;
use App\Models\FinanceAccount;
use App\Models\FinanceProject;
use Illuminate\Http\Request;

class OrgFinanceExpenseEntryController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'expense_category_id' => 'nullable|uuid|exists:expense_categories,id',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'status' => 'nullable|in:pending,approved,rejected',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'search' => 'nullable|string|max:255',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = ExpenseEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with(['account', 'expenseCategory', 'project', 'approvedBy', 'currency']);

        if (!empty($validated['account_id'])) {
            $query->where('account_id', $validated['account_id']);
        }
        if (!empty($validated['expense_category_id'])) {
            $query->where('expense_category_id', $validated['expense_category_id']);
        }
        if (!empty($validated['project_id'])) {
            $query->where('project_id', $validated['project_id']);
        }
        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }
        if (!empty($validated['date_from'])) {
            $query->where('date', '>=', $validated['date_from']);
        }
        if (!empty($validated['date_to'])) {
            $query->where('date', '<=', $validated['date_to']);
        }
        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%")
                    ->orWhere('paid_to', 'ILIKE', "%{$search}%");
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
            'expense_category_id' => 'required|uuid|exists:expense_categories,id',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'reference_no' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'paid_to' => 'nullable|string|max:255',
            'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
        ]);

        $account = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['account_id']);
        if (!$account) {
            return response()->json(['error' => 'Invalid account - must be org-level'], 400);
        }

        $category = ExpenseCategory::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['expense_category_id']);
        if (!$category) {
            return response()->json(['error' => 'Invalid expense category - must be org-level'], 400);
        }

        $currencyId = $validated['currency_id'] ?? $account->currency_id;
        if (!$currencyId) {
            $base = Currency::where('organization_id', $orgId)->whereNull('school_id')->where('is_base', true)->where('is_active', true)->whereNull('deleted_at')->first();
            $currencyId = $base?->id;
        }
        if (!$currencyId) {
            return response()->json(['error' => 'Currency is required. Configure a base currency for org finance.'], 400);
        }

        $currency = Currency::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($currencyId);
        if (!$currency) {
            return response()->json(['error' => 'Invalid currency'], 400);
        }

        if ($account->currency_id && $currencyId !== $account->currency_id) {
            $rate = ExchangeRate::getRate($orgId, null, $currencyId, $account->currency_id, $validated['date']);
            if ($rate === null) {
                return response()->json(['error' => 'Exchange rate not found for entry date'], 422);
            }
        }

        if (!empty($validated['project_id'])) {
            $project = FinanceProject::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['project_id']);
            if (!$project) {
                return response()->json(['error' => 'Invalid project - must be org-level'], 400);
            }
        }

        $entry = ExpenseEntry::create([
            'organization_id' => $orgId,
            'school_id' => null,
            'currency_id' => $currencyId,
            'account_id' => $validated['account_id'],
            'expense_category_id' => $validated['expense_category_id'],
            'project_id' => $validated['project_id'] ?? null,
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'reference_no' => $validated['reference_no'] ?? null,
            'description' => $validated['description'] ?? null,
            'paid_to' => $validated['paid_to'] ?? null,
            'payment_method' => $validated['payment_method'] ?? 'cash',
            'status' => 'approved',
        ]);

        $entry->load(['account', 'expenseCategory', 'project', 'approvedBy', 'currency']);
        return response()->json($entry, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $entry = ExpenseEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with(['account', 'expenseCategory', 'project', 'approvedBy', 'currency'])
            ->find($id);

        if (!$entry) {
            return response()->json(['error' => 'Expense entry not found'], 404);
        }

        return response()->json($entry);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $entry = ExpenseEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$entry) {
            return response()->json(['error' => 'Expense entry not found'], 404);
        }

        $validated = $request->validate([
            'account_id' => 'sometimes|uuid|exists:finance_accounts,id',
            'expense_category_id' => 'sometimes|uuid|exists:expense_categories,id',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'amount' => 'sometimes|numeric|min:0.01',
            'date' => 'sometimes|date',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'reference_no' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'paid_to' => 'nullable|string|max:255',
            'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
            'status' => 'nullable|in:pending,approved,rejected',
        ]);

        if (!empty($validated['account_id'])) {
            $account = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['account_id']);
            if (!$account) {
                return response()->json(['error' => 'Invalid account - must be org-level'], 400);
            }
        }
        if (!empty($validated['expense_category_id'])) {
            $cat = ExpenseCategory::whereNull('deleted_at')->where('organization_id', $orgId)->whereNull('school_id')->find($validated['expense_category_id']);
            if (!$cat) {
                return response()->json(['error' => 'Invalid expense category - must be org-level'], 400);
            }
        }

        $entry->update($validated);
        $entry->load(['account', 'expenseCategory', 'project', 'approvedBy', 'currency']);
        return response()->json($entry);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $entry = ExpenseEntry::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$entry) {
            return response()->json(['error' => 'Expense entry not found'], 404);
        }

        $entry->delete();
        return response()->noContent();
    }
}
