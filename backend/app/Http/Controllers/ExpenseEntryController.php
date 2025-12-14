<?php

namespace App\Http\Controllers;

use App\Models\ExpenseEntry;
use App\Models\FinanceAccount;
use App\Models\ExpenseCategory;
use App\Models\FinanceProject;
use App\Models\ExchangeRate;
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
                ->with(['account', 'expenseCategory', 'project', 'approvedBy', 'currency']);

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
                'currency_id' => 'nullable|uuid|exists:currencies,id',
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
                return response()->json(['error' => 'Invalid account - does not belong to your organization'], 400);
            }

            // Verify expense category belongs to organization
            $category = ExpenseCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($validated['expense_category_id']);

            if (!$category) {
                return response()->json(['error' => 'Invalid expense category - does not belong to your organization'], 400);
            }

            // Handle currency_id - ALWAYS ensure it's set (never allow NULL)
            $currencyId = $validated['currency_id'] ?? null;
            if (!$currencyId) {
                // Try account's currency first
                $currencyId = $account->currency_id;

                // If account has no currency, use base currency
                if (!$currencyId) {
                    $baseCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                        ->where('is_base', true)
                        ->where('is_active', true)
                        ->whereNull('deleted_at')
                        ->first();
                    if ($baseCurrency) {
                        $currencyId = $baseCurrency->id;
                    }
                }
            }

            // CRITICAL: Always require currency_id - never allow NULL
            if (!$currencyId) {
                return response()->json(['error' => 'Currency is required. Please select a currency or ensure a base currency is configured.'], 400);
            }

            // Verify currency belongs to organization
            $currency = \App\Models\Currency::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($currencyId);

            if (!$currency) {
                return response()->json(['error' => 'Invalid currency - does not belong to your organization'], 400);
            }

            // Validate exchange rate if entry currency differs from account currency
            if ($account->currency_id && $currencyId !== $account->currency_id) {
                $rate = ExchangeRate::getRate(
                    $profile->organization_id,
                    $currencyId,
                    $account->currency_id,
                    $validated['date']
                );

                if ($rate === null) {
                    $fromCurrencyName = $currency->name ?? $currency->code ?? 'Unknown';
                    $toCurrency = \App\Models\Currency::find($account->currency_id);
                    $toCurrencyName = $toCurrency ? ($toCurrency->name ?? $toCurrency->code ?? 'Unknown') : 'Unknown';
                    return response()->json([
                        'error' => "Exchange rate not found for converting from {$fromCurrencyName} to {$toCurrencyName} on {$validated['date']}"
                    ], 422);
                }
            }

            // Verify project belongs to organization (if provided)
            if (!empty($validated['project_id'])) {
                $project = FinanceProject::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['project_id']);

                if (!$project) {
                    return response()->json(['error' => 'Invalid project - does not belong to your organization'], 400);
                }
            }

            // Check if account has sufficient balance (convert expense amount to account currency if needed)
            $expenseAmount = (float) $validated['amount'];
            if ($account->currency_id && $currencyId !== $account->currency_id) {
                // Convert expense amount to account currency for comparison
                $rate = ExchangeRate::getRate(
                    $profile->organization_id,
                    $currencyId,
                    $account->currency_id,
                    $validated['date']
                );
                if ($rate !== null) {
                    $expenseAmount = $expenseAmount * $rate;
                }
                // If rate not found, use original amount (will fail balance check if currencies differ)
            }
            
            if ($account->current_balance < $expenseAmount) {
                return response()->json(['error' => 'Insufficient balance in account'], 400);
            }

            // Create expense entry (model hooks will handle balance updates in transaction)
            $entry = ExpenseEntry::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $validated['school_id'] ?? null,
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
                'status' => 'approved', // Default approved for MVP
            ]);

            // Load relationships for response
            $entry->load(['account', 'expenseCategory', 'project', 'approvedBy', 'currency']);

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
                ->with(['account', 'expenseCategory', 'project', 'approvedBy', 'currency'])
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
                'currency_id' => 'nullable|uuid|exists:currencies,id',
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
                    return response()->json(['error' => 'Invalid account - does not belong to your organization'], 400);
                }
            }

            // Verify expense category if changed
            if (!empty($validated['expense_category_id'])) {
                $category = ExpenseCategory::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['expense_category_id']);

                if (!$category) {
                    return response()->json(['error' => 'Invalid expense category - does not belong to your organization'], 400);
                }
            }

            // Verify project if changed
            if (array_key_exists('project_id', $validated) && $validated['project_id'] !== null) {
                $project = FinanceProject::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['project_id']);

                if (!$project) {
                    return response()->json(['error' => 'Invalid project - does not belong to your organization'], 400);
                }
            }

            // Handle currency_id - ALWAYS ensure it's set (never allow NULL)
            if (array_key_exists('currency_id', $validated)) {
                $currencyId = $validated['currency_id'];

                // If currency_id is explicitly set to null, try to get from account or base currency
                if (!$currencyId) {
                    $accountForValidation = !empty($validated['account_id']) 
                        ? FinanceAccount::whereNull('deleted_at')
                            ->where('organization_id', $profile->organization_id)
                            ->find($validated['account_id'])
                        : $entry->account;
                    $currencyId = $accountForValidation ? $accountForValidation->currency_id : null;

                    if (!$currencyId) {
                        $baseCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                            ->where('is_base', true)
                            ->where('is_active', true)
                            ->whereNull('deleted_at')
                            ->first();
                        if ($baseCurrency) {
                            $currencyId = $baseCurrency->id;
                        }
                    }
                }

                // CRITICAL: Always require currency_id - never allow NULL
                if (!$currencyId) {
                    return response()->json(['error' => 'Currency is required. Please select a currency or ensure a base currency is configured.'], 400);
                }

                // Verify currency belongs to organization
                $currency = \App\Models\Currency::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($currencyId);

                if (!$currency) {
                    return response()->json(['error' => 'Invalid currency - does not belong to your organization'], 400);
                }

                // Get account for exchange rate validation
                $accountForValidation = !empty($validated['account_id']) 
                    ? FinanceAccount::whereNull('deleted_at')
                        ->where('organization_id', $profile->organization_id)
                        ->find($validated['account_id'])
                    : $entry->account;

                // Validate exchange rate if entry currency differs from account currency
                if ($accountForValidation && $accountForValidation->currency_id && $currencyId !== $accountForValidation->currency_id) {
                    $entryDate = $validated['date'] ?? $entry->date->toDateString();
                    $rate = ExchangeRate::getRate(
                        $profile->organization_id,
                        $currencyId,
                        $accountForValidation->currency_id,
                        $entryDate
                    );

                    if ($rate === null) {
                        $fromCurrencyName = $currency->name ?? $currency->code ?? 'Unknown';
                        $toCurrency = \App\Models\Currency::find($accountForValidation->currency_id);
                        $toCurrencyName = $toCurrency ? ($toCurrency->name ?? $toCurrency->code ?? 'Unknown') : 'Unknown';
                        return response()->json([
                            'error' => "Exchange rate not found for converting from {$fromCurrencyName} to {$toCurrencyName} on {$entryDate}"
                        ], 422);
                    }
                }

                $validated['currency_id'] = $currencyId;
            } else {
                // If currency_id is not in the update, ensure existing entry has one
                // This handles cases where old entries might have NULL currency_id
                if (!$entry->currency_id) {
                    $accountForValidation = $entry->account;
                    $currencyId = $accountForValidation ? $accountForValidation->currency_id : null;

                    if (!$currencyId) {
                        $baseCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                            ->where('is_base', true)
                            ->where('is_active', true)
                            ->whereNull('deleted_at')
                            ->first();
                        if ($baseCurrency) {
                            $currencyId = $baseCurrency->id;
                        }
                    }

                    if ($currencyId) {
                        $validated['currency_id'] = $currencyId;
                    }
                }
            }

            $entry->update($validated);
            $entry->load(['account', 'expenseCategory', 'project', 'approvedBy', 'currency']);

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
