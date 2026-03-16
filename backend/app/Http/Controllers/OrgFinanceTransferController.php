<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\ExpenseCategory;
use App\Models\ExpenseEntry;
use App\Models\FinanceAccount;
use App\Models\IncomeCategory;
use App\Models\IncomeEntry;
use App\Models\OrgSchoolTransfer;
use App\Models\SchoolBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrgFinanceTransferController extends Controller
{
    use OrgFinanceScope;

    /**
     * List org-to-school transfers for the organization.
     */
    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = OrgSchoolTransfer::query()
            ->where('organization_id', $orgId)
            ->with(['school:id,school_name', 'orgAccount:id,name,code', 'schoolAccount:id,name,code', 'currency:id,code,symbol']);

        if (!empty($validated['school_id'])) {
            $school = SchoolBranding::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->find($validated['school_id']);
            if ($school) {
                $query->where('school_id', $validated['school_id']);
            }
        }
        if (!empty($validated['date_from'])) {
            $query->where('transfer_date', '>=', $validated['date_from']);
        }
        if (!empty($validated['date_to'])) {
            $query->where('transfer_date', '<=', $validated['date_to']);
        }

        $query->orderBy('transfer_date', 'desc')->orderBy('created_at', 'desc');

        $perPage = $validated['per_page'] ?? 25;
        $transfers = isset($validated['page']) ? $query->paginate($perPage) : $query->get();

        return response()->json($transfers);
    }

    /**
     * Create org-to-school transfer: org expense + school income + transfer record in one transaction.
     */
    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $validated = $request->validate([
            'school_id' => 'required|uuid|exists:school_branding,id',
            'org_account_id' => 'required|uuid|exists:finance_accounts,id',
            'school_account_id' => 'required|uuid|exists:finance_accounts,id',
            'amount' => 'required|numeric|min:0.01',
            'transfer_date' => 'required|date',
            'org_expense_category_id' => 'required|uuid|exists:expense_categories,id',
            'school_income_category_id' => 'required|uuid|exists:income_categories,id',
            'reference_no' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $schoolId = $validated['school_id'];

        // Ensure school belongs to org
        $school = SchoolBranding::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($schoolId);
        if (!$school) {
            return response()->json(['error' => 'School not found or does not belong to your organization'], 422);
        }

        $orgAccount = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($validated['org_account_id']);
        if (!$orgAccount) {
            return response()->json(['error' => 'Org account must be an organization-level account'], 422);
        }

        $schoolAccount = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->find($validated['school_account_id']);
        if (!$schoolAccount) {
            return response()->json(['error' => 'School account must belong to the selected school'], 422);
        }

        $orgCategory = ExpenseCategory::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($validated['org_expense_category_id']);
        if (!$orgCategory) {
            return response()->json(['error' => 'Expense category must be an org-level category'], 422);
        }

        $schoolCategory = IncomeCategory::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->find($validated['school_income_category_id']);
        if (!$schoolCategory) {
            return response()->json(['error' => 'Income category must belong to the selected school'], 422);
        }

        $currencyId = $orgAccount->currency_id;
        if (!$currencyId) {
            $base = \App\Models\Currency::where('organization_id', $orgId)
                ->whereNull('school_id')
                ->where('is_base', true)
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->first();
            $currencyId = $base?->id;
        }
        if (!$currencyId) {
            return response()->json(['error' => 'Org account must have a currency. Configure org finance base currency.'], 422);
        }

        $amount = (float) $validated['amount'];
        $transferDate = $validated['transfer_date'];
        $referenceNo = $validated['reference_no'] ?? ('TRF-' . now()->format('Ymd') . '-' . substr((string) str()->uuid(), 0, 8));
        $schoolName = $school->name ?? $schoolId;
        $description = 'Transfer to school: ' . $schoolName;
        $notesForIncome = $validated['notes'] ?? null;
        $incomeDescription = 'Transfer from organization' . ($notesForIncome ? ': ' . $notesForIncome : '');

        $transfer = null;
        DB::transaction(function () use ($request, $orgId, $schoolId, $validated, $orgAccount, $schoolAccount, $orgCategory, $schoolCategory, $currencyId, $amount, $transferDate, $referenceNo, $description, $incomeDescription, &$transfer) {
            $expense = ExpenseEntry::create([
                'organization_id' => $orgId,
                'school_id' => null,
                'currency_id' => $currencyId,
                'account_id' => $orgAccount->id,
                'expense_category_id' => $orgCategory->id,
                'project_id' => null,
                'amount' => $amount,
                'date' => $transferDate,
                'reference_no' => $referenceNo,
                'description' => $description,
                'paid_to' => $schoolAccount->name ?? null,
                'payment_method' => 'bank_transfer',
                'status' => 'approved',
            ]);

            $income = IncomeEntry::create([
                'organization_id' => $orgId,
                'school_id' => $schoolId,
                'currency_id' => $currencyId,
                'account_id' => $schoolAccount->id,
                'income_category_id' => $schoolCategory->id,
                'project_id' => null,
                'donor_id' => null,
                'amount' => $amount,
                'date' => $transferDate,
                'reference_no' => $referenceNo,
                'description' => $incomeDescription,
                'received_by_user_id' => $request->user()->id,
                'payment_method' => 'bank_transfer',
            ]);

            $transfer = OrgSchoolTransfer::create([
                'organization_id' => $orgId,
                'school_id' => $schoolId,
                'org_account_id' => $orgAccount->id,
                'school_account_id' => $schoolAccount->id,
                'currency_id' => $currencyId,
                'amount' => $amount,
                'transfer_date' => $transferDate,
                'reference_no' => $referenceNo,
                'notes' => $validated['notes'] ?? null,
                'status' => 'completed',
                'org_expense_entry_id' => $expense->id,
                'school_income_entry_id' => $income->id,
                'created_by' => $request->user()->id,
            ]);
        });

        $transfer->load(['school:id,school_name', 'orgAccount:id,name,code', 'schoolAccount:id,name,code', 'currency:id,code,symbol']);
        return response()->json($transfer, 201);
    }

    /**
     * List finance accounts for a given school (for org-admin transfer form).
     */
    public function schoolAccounts(Request $request, string $schoolId)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $school = SchoolBranding::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($schoolId);
        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        $accounts = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'currency_id', 'current_balance']);

        return response()->json($accounts);
    }

    /**
     * List income categories for a given school (for org-admin transfer form).
     */
    public function schoolIncomeCategories(Request $request, string $schoolId)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $school = SchoolBranding::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($schoolId);
        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        $categories = IncomeCategory::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json($categories);
    }
}
