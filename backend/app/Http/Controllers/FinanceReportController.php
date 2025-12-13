<?php

namespace App\Http\Controllers;

use App\Models\FinanceAccount;
use App\Models\IncomeEntry;
use App\Models\ExpenseEntry;
use App\Models\IncomeCategory;
use App\Models\ExpenseCategory;
use App\Models\FinanceProject;
use App\Models\Donor;
use App\Models\Currency;
use App\Models\ExchangeRate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceReportController extends Controller
{
    /**
     * Finance Dashboard Stats
     */
    public function dashboard(Request $request)
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
                if (!$user->hasPermissionTo('finance_reports.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_reports.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $orgId = $profile->organization_id;

            // Get target currency for conversion (optional)
            $validated = $request->validate([
                'target_currency_id' => 'nullable|uuid|exists:currencies,id',
            ]);
            $targetCurrencyId = $validated['target_currency_id'] ?? null;

            // Get base currency if no target specified
            if (!$targetCurrencyId) {
                $baseCurrency = Currency::where('organization_id', $orgId)
                    ->where('is_base', true)
                    ->where('is_active', true)
                    ->first();
                $targetCurrencyId = $baseCurrency?->id;
            }

            // Get current month/year
            $currentMonth = date('Y-m');
            $currentMonthStart = date('Y-m-01');
            $currentMonthEnd = date('Y-m-t');

            // Total balances across all accounts (with currency conversion)
            $accounts = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('is_active', true)
                ->get();
            
            $totalBalance = 0;
            foreach ($accounts as $account) {
                $balance = (float) $account->current_balance;
                if ($targetCurrencyId && $account->currency_id && $account->currency_id !== $targetCurrencyId) {
                    $balance = $this->convertAmount($balance, $account->currency_id, $targetCurrencyId, $orgId);
                }
                $totalBalance += $balance;
            }

            // Current month income (with currency conversion)
            $incomeEntries = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->whereBetween('date', [$currentMonthStart, $currentMonthEnd])
                ->get();
            
            $currentMonthIncome = 0;
            foreach ($incomeEntries as $entry) {
                $amount = (float) $entry->amount;
                if ($targetCurrencyId && $entry->currency_id && $entry->currency_id !== $targetCurrencyId) {
                    $amount = $this->convertAmount($amount, $entry->currency_id, $targetCurrencyId, $orgId, $entry->date);
                }
                $currentMonthIncome += $amount;
            }

            // Current month expense (with currency conversion)
            $expenseEntries = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('status', 'approved')
                ->whereBetween('date', [$currentMonthStart, $currentMonthEnd])
                ->get();
            
            $currentMonthExpense = 0;
            foreach ($expenseEntries as $entry) {
                $amount = (float) $entry->amount;
                if ($targetCurrencyId && $entry->currency_id && $entry->currency_id !== $targetCurrencyId) {
                    $amount = $this->convertAmount($amount, $entry->currency_id, $targetCurrencyId, $orgId, $entry->date);
                }
                $currentMonthExpense += $amount;
            }

            // Account balances (with currency conversion)
            $accountBalances = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(function ($account) use ($targetCurrencyId, $orgId) {
                    $balance = (float) $account->current_balance;
                    if ($targetCurrencyId && $account->currency_id && $account->currency_id !== $targetCurrencyId) {
                        $balance = $this->convertAmount($balance, $account->currency_id, $targetCurrencyId, $orgId);
                    }
                    return [
                        'id' => $account->id,
                        'name' => $account->name,
                        'current_balance' => $balance,
                        'type' => $account->type,
                    ];
                });

            // Income by category (current month) - with currency conversion
            $incomeByCategoryRaw = IncomeEntry::whereNull('income_entries.deleted_at')
                ->where('income_entries.organization_id', $orgId)
                ->whereBetween('income_entries.date', [$currentMonthStart, $currentMonthEnd])
                ->join('income_categories', 'income_entries.income_category_id', '=', 'income_categories.id')
                ->whereNull('income_categories.deleted_at')
                ->select('income_categories.id', 'income_categories.name', 'income_entries.amount', 'income_entries.currency_id', 'income_entries.date')
                ->get();
            
            $incomeByCategory = $incomeByCategoryRaw->groupBy('id')->map(function ($group) use ($targetCurrencyId, $orgId) {
                $total = 0;
                foreach ($group as $entry) {
                    $amount = (float) $entry->amount;
                    if ($targetCurrencyId && $entry->currency_id && $entry->currency_id !== $targetCurrencyId) {
                        $amount = $this->convertAmount($amount, $entry->currency_id, $targetCurrencyId, $orgId, $entry->date);
                    }
                    $total += $amount;
                }
                return [
                    'id' => $group->first()->id,
                    'name' => $group->first()->name,
                    'total' => $total,
                ];
            })->values()->sortByDesc('total');

            // Expense by category (current month) - with currency conversion
            $expenseByCategoryRaw = ExpenseEntry::whereNull('expense_entries.deleted_at')
                ->where('expense_entries.organization_id', $orgId)
                ->where('expense_entries.status', 'approved')
                ->whereBetween('expense_entries.date', [$currentMonthStart, $currentMonthEnd])
                ->join('expense_categories', 'expense_entries.expense_category_id', '=', 'expense_categories.id')
                ->whereNull('expense_categories.deleted_at')
                ->select('expense_categories.id', 'expense_categories.name', 'expense_entries.amount', 'expense_entries.currency_id', 'expense_entries.date')
                ->get();
            
            $expenseByCategory = $expenseByCategoryRaw->groupBy('id')->map(function ($group) use ($targetCurrencyId, $orgId) {
                $total = 0;
                foreach ($group as $entry) {
                    $amount = (float) $entry->amount;
                    if ($targetCurrencyId && $entry->currency_id && $entry->currency_id !== $targetCurrencyId) {
                        $amount = $this->convertAmount($amount, $entry->currency_id, $targetCurrencyId, $orgId, $entry->date);
                    }
                    $total += $amount;
                }
                return [
                    'id' => $group->first()->id,
                    'name' => $group->first()->name,
                    'total' => $total,
                ];
            })->values()->sortByDesc('total');

            // Active projects count
            $activeProjects = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('is_active', true)
                ->where('status', 'active')
                ->count();

            // Active donors count
            $activeDonors = Donor::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('is_active', true)
                ->count();

            // Recent income entries
            $recentIncome = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->with(['incomeCategory', 'donor'])
                ->orderBy('date', 'desc')
                ->limit(5)
                ->get();

            // Recent expense entries
            $recentExpenses = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('status', 'approved')
                ->with(['expenseCategory'])
                ->orderBy('date', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'summary' => [
                    'total_balance' => $totalBalance,
                    'current_month_income' => $currentMonthIncome,
                    'current_month_expense' => $currentMonthExpense,
                    'net_this_month' => $currentMonthIncome - $currentMonthExpense,
                    'active_projects' => $activeProjects,
                    'active_donors' => $activeDonors,
                ],
                'account_balances' => $accountBalances,
                'income_by_category' => $incomeByCategory,
                'expense_by_category' => $expenseByCategory,
                'recent_income' => $recentIncome,
                'recent_expenses' => $recentExpenses,
            ]);
        } catch (\Exception $e) {
            \Log::error('FinanceReportController@dashboard error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching dashboard data'], 500);
        }
    }

    /**
     * Daily Cashbook Report
     */
    public function dailyCashbook(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_reports.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'date' => 'required|date',
                'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            ]);

            $orgId = $profile->organization_id;
            $date = $validated['date'];

            // Build query for accounts
            $accountQuery = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('is_active', true);

            if (!empty($validated['account_id'])) {
                $accountQuery->where('id', $validated['account_id']);
            }

            $accounts = $accountQuery->get();
            $cashbook = [];

            foreach ($accounts as $account) {
                // Calculate opening balance for the day
                // Opening = account opening_balance + all income before date - all expenses before date
                $incomeBefore = IncomeEntry::whereNull('deleted_at')
                    ->where('organization_id', $orgId)
                    ->where('account_id', $account->id)
                    ->where('date', '<', $date)
                    ->sum('amount');

                $expenseBefore = ExpenseEntry::whereNull('deleted_at')
                    ->where('organization_id', $orgId)
                    ->where('account_id', $account->id)
                    ->where('status', 'approved')
                    ->where('date', '<', $date)
                    ->sum('amount');

                $openingBalance = $account->opening_balance + $incomeBefore - $expenseBefore;

                // Get day's income
                $dayIncome = IncomeEntry::whereNull('deleted_at')
                    ->where('organization_id', $orgId)
                    ->where('account_id', $account->id)
                    ->where('date', $date)
                    ->with(['incomeCategory', 'donor'])
                    ->get();

                $totalDayIncome = $dayIncome->sum('amount');

                // Get day's expenses
                $dayExpenses = ExpenseEntry::whereNull('deleted_at')
                    ->where('organization_id', $orgId)
                    ->where('account_id', $account->id)
                    ->where('status', 'approved')
                    ->where('date', $date)
                    ->with(['expenseCategory'])
                    ->get();

                $totalDayExpense = $dayExpenses->sum('amount');

                $closingBalance = $openingBalance + $totalDayIncome - $totalDayExpense;

                $cashbook[] = [
                    'account' => [
                        'id' => $account->id,
                        'name' => $account->name,
                        'type' => $account->type,
                    ],
                    'opening_balance' => $openingBalance,
                    'income' => $dayIncome,
                    'total_income' => $totalDayIncome,
                    'expenses' => $dayExpenses,
                    'total_expense' => $totalDayExpense,
                    'closing_balance' => $closingBalance,
                ];
            }

            return response()->json([
                'date' => $date,
                'cashbook' => $cashbook,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceReportController@dailyCashbook error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while generating cashbook'], 500);
        }
    }

    /**
     * Income vs Expense Report
     */
    public function incomeVsExpense(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_reports.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'school_id' => 'nullable|uuid|exists:school_branding,id',
            ]);

            $orgId = $profile->organization_id;

            // Income by category
            $incomeQuery = IncomeEntry::whereNull('income_entries.deleted_at')
                ->where('income_entries.organization_id', $orgId)
                ->whereBetween('income_entries.date', [$validated['start_date'], $validated['end_date']]);

            if (!empty($validated['school_id'])) {
                $incomeQuery->where('income_entries.school_id', $validated['school_id']);
            }

            $incomeByCategory = $incomeQuery
                ->join('income_categories', 'income_entries.income_category_id', '=', 'income_categories.id')
                ->whereNull('income_categories.deleted_at')
                ->groupBy('income_categories.id', 'income_categories.name', 'income_categories.code')
                ->select(
                    'income_categories.id',
                    'income_categories.name',
                    'income_categories.code',
                    DB::raw('SUM(income_entries.amount) as total'),
                    DB::raw('COUNT(income_entries.id) as count')
                )
                ->orderByDesc('total')
                ->get();

            $totalIncome = $incomeByCategory->sum('total');

            // Expense by category
            $expenseQuery = ExpenseEntry::whereNull('expense_entries.deleted_at')
                ->where('expense_entries.organization_id', $orgId)
                ->where('expense_entries.status', 'approved')
                ->whereBetween('expense_entries.date', [$validated['start_date'], $validated['end_date']]);

            if (!empty($validated['school_id'])) {
                $expenseQuery->where('expense_entries.school_id', $validated['school_id']);
            }

            $expenseByCategory = $expenseQuery
                ->join('expense_categories', 'expense_entries.expense_category_id', '=', 'expense_categories.id')
                ->whereNull('expense_categories.deleted_at')
                ->groupBy('expense_categories.id', 'expense_categories.name', 'expense_categories.code')
                ->select(
                    'expense_categories.id',
                    'expense_categories.name',
                    'expense_categories.code',
                    DB::raw('SUM(expense_entries.amount) as total'),
                    DB::raw('COUNT(expense_entries.id) as count')
                )
                ->orderByDesc('total')
                ->get();

            $totalExpense = $expenseByCategory->sum('total');

            return response()->json([
                'period' => [
                    'start_date' => $validated['start_date'],
                    'end_date' => $validated['end_date'],
                ],
                'summary' => [
                    'total_income' => $totalIncome,
                    'total_expense' => $totalExpense,
                    'net' => $totalIncome - $totalExpense,
                ],
                'income_by_category' => $incomeByCategory,
                'expense_by_category' => $expenseByCategory,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceReportController@incomeVsExpense error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while generating report'], 500);
        }
    }

    /**
     * Project Summary Report
     */
    public function projectSummary(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_reports.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'status' => 'nullable|in:planning,active,completed,cancelled',
            ]);

            $orgId = $profile->organization_id;

            $query = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $orgId);

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            $projects = $query->orderBy('name')->get();

            $projectSummaries = [];
            foreach ($projects as $project) {
                // Recalculate totals
                $totalIncome = $project->incomeEntries()->whereNull('deleted_at')->sum('amount');
                $totalExpense = $project->expenseEntries()->whereNull('deleted_at')->where('status', 'approved')->sum('amount');

                $projectSummaries[] = [
                    'project' => $project,
                    'total_income' => $totalIncome,
                    'total_expense' => $totalExpense,
                    'balance' => $totalIncome - $totalExpense,
                    'budget_remaining' => $project->budget_amount ? $project->budget_amount - $totalExpense : null,
                    'budget_utilization' => $project->budget_amount > 0 ? round(($totalExpense / $project->budget_amount) * 100, 2) : null,
                ];
            }

            return response()->json([
                'projects' => $projectSummaries,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceReportController@projectSummary error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while generating project summary'], 500);
        }
    }

    /**
     * Donor Summary Report
     */
    public function donorSummary(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_reports.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
            ]);

            $orgId = $profile->organization_id;

            $query = Donor::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('is_active', true);

            $donors = $query->orderBy('name')->get();

            $donorSummaries = [];
            foreach ($donors as $donor) {
                $incomeQuery = $donor->incomeEntries()->whereNull('deleted_at');

                if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
                    $incomeQuery->whereBetween('date', [$validated['start_date'], $validated['end_date']]);
                }

                $periodTotal = $incomeQuery->sum('amount');
                $donationCount = $incomeQuery->count();

                $donorSummaries[] = [
                    'donor' => $donor,
                    'total_donated' => $donor->total_donated,
                    'period_total' => $periodTotal,
                    'donation_count' => $donationCount,
                ];
            }

            // Sort by period total or total donated
            usort($donorSummaries, function ($a, $b) {
                return $b['total_donated'] <=> $a['total_donated'];
            });

            return response()->json([
                'period' => [
                    'start_date' => $validated['start_date'] ?? null,
                    'end_date' => $validated['end_date'] ?? null,
                ],
                'donors' => $donorSummaries,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceReportController@donorSummary error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while generating donor summary'], 500);
        }
    }

    /**
     * Account Balances Report
     */
    public function accountBalances(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_reports.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $orgId = $profile->organization_id;

            $accounts = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->orderBy('name')
                ->get();

            $accountSummaries = [];
            $totalBalance = 0;

            foreach ($accounts as $account) {
                // Recalculate balance
                $account->recalculateBalance();

                $totalIncome = $account->incomeEntries()->whereNull('deleted_at')->sum('amount');
                $totalExpense = $account->expenseEntries()->whereNull('deleted_at')->where('status', 'approved')->sum('amount');

                $accountSummaries[] = [
                    'account' => $account,
                    'opening_balance' => $account->opening_balance,
                    'total_income' => $totalIncome,
                    'total_expense' => $totalExpense,
                    'current_balance' => $account->current_balance,
                ];

                if ($account->is_active) {
                    $totalBalance += $account->current_balance;
                }
            }

            return response()->json([
                'accounts' => $accountSummaries,
                'total_balance' => $totalBalance,
            ]);
        } catch (\Exception $e) {
            \Log::error('FinanceReportController@accountBalances error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while generating account balances'], 500);
        }
    }
}
