<?php

namespace App\Http\Controllers;

use App\Models\ExpenseEntry;
use App\Models\FinanceAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseEntryController extends Controller
{
    /**
     * Display a listing of expense entries
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
                if (!$user->hasPermissionTo('finance_expense.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_expense.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'school_id' => 'nullable|uuid|exists:school_branding,id',
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
                ->where('organization_id', $profile->organization_id)
                ->with(['account', 'expenseCategory', 'project', 'approvedBy']);

            if (!empty($validated['school_id'])) {
                $query->where('school_id', $validated['school_id']);
            }

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

            // Pagination
            $perPage = $validated['per_page'] ?? 25;
            if (isset($validated['page'])) {
                $entries = $query->paginate($perPage);
            } else {
                $entries = $query->get();
            }

            return response()->json($entries);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExpenseEntryController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching expense entries'], 500);
        }
    }

    /**
     * Store a newly created expense entry
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
                if (!$user->hasPermissionTo('finance_expense.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'account_id' => 'required|uuid|exists:finance_accounts,id',
                'expense_category_id' => 'required|uuid|exists:expense_categories,id',
                'amount' => 'required|numeric|min:0.01',
                'date' => 'required|date',
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'project_id' => 'nullable|uuid|exists:finance_projects,id',
                'reference_no' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'paid_to' => 'nullable|string|max:255',
                'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
            ]);

            // Verify account belongs to organization
            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($validated['account_id']);

            if (!$account) {
                return response()->json(['error' => 'Invalid account'], 400);
            }

            // Check if account has sufficient balance
            if ($account->current_balance < $validated['amount']) {
                return response()->json(['error' => 'Insufficient balance in account'], 400);
            }

            $entry = ExpenseEntry::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $validated['school_id'] ?? null,
                'account_id' => $validated['account_id'],
                'expense_category_id' => $validated['expense_category_id'],
                'project_id' => $validated['project_id'] ?? null,
                'amount' => $validated['amount'],
                'date' => $validated['date'],
                'reference_no' => $validated['reference_no'] ?? null,
                'description' => $validated['description'] ?? null,
                'paid_to' => $validated['paid_to'] ?? null,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'status' => 'approved', // Default approved for MVP
            ]);

            // Load relationships for response
            $entry->load(['account', 'expenseCategory', 'project', 'approvedBy']);

            return response()->json($entry, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExpenseEntryController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating expense entry'], 500);
        }
    }

    /**
     * Display the specified expense entry
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
                if (!$user->hasPermissionTo('finance_expense.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $entry = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->with(['account', 'expenseCategory', 'project', 'approvedBy'])
                ->find($id);

            if (!$entry) {
                return response()->json(['error' => 'Expense entry not found'], 404);
            }

            return response()->json($entry);
        } catch (\Exception $e) {
            \Log::error('ExpenseEntryController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching expense entry'], 500);
        }
    }

    /**
     * Update the specified expense entry
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
                if (!$user->hasPermissionTo('finance_expense.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $entry = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$entry) {
                return response()->json(['error' => 'Expense entry not found'], 404);
            }

            $validated = $request->validate([
                'account_id' => 'sometimes|uuid|exists:finance_accounts,id',
                'expense_category_id' => 'sometimes|uuid|exists:expense_categories,id',
                'amount' => 'sometimes|numeric|min:0.01',
                'date' => 'sometimes|date',
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'project_id' => 'nullable|uuid|exists:finance_projects,id',
                'reference_no' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'paid_to' => 'nullable|string|max:255',
                'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
            ]);

            // Verify account if changed
            if (!empty($validated['account_id'])) {
                $account = FinanceAccount::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['account_id']);

                if (!$account) {
                    return response()->json(['error' => 'Invalid account'], 400);
                }
            }

            $entry->update($validated);
            $entry->load(['account', 'expenseCategory', 'project', 'approvedBy']);

            return response()->json($entry);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExpenseEntryController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating expense entry'], 500);
        }
    }

    /**
     * Remove the specified expense entry (soft delete)
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
                if (!$user->hasPermissionTo('finance_expense.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $entry = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$entry) {
                return response()->json(['error' => 'Expense entry not found'], 404);
            }

            $entry->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('ExpenseEntryController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting expense entry'], 500);
        }
    }
}
