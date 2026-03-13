<?php

namespace App\Services\Reports;

use App\Models\Currency;
use App\Models\Donor;
use App\Models\ExchangeRate;
use App\Models\ExpenseEntry;
use App\Models\FinanceAccount;
use App\Models\FinanceProject;
use App\Models\IncomeEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class FinanceReportingService
{
    /**
     * Apply organization and optional school scope to a query.
     * When $schoolId is null, scope to org-level rows (school_id IS NULL).
     */
    private function scopeOrgAndSchool(Builder $query, string $orgId, ?string $schoolId): void
    {
        $query->where('organization_id', $orgId);
        if ($schoolId === null) {
            $query->whereNull('school_id');
        } else {
            $query->where('school_id', $schoolId);
        }
    }

    private function convertAmount(float $amount, $fromCurrencyId, $toCurrencyId, string $orgId, ?string $schoolId, $date = null): float
    {
        if (!$fromCurrencyId || !$toCurrencyId || $fromCurrencyId === $toCurrencyId) {
            return $amount;
        }
        $dateString = $date ? (\is_string($date) ? $date : (is_object($date) && method_exists($date, 'format') ? $date->format('Y-m-d') : now()->toDateString())) : null;
        $rate = ExchangeRate::getRate($orgId, $schoolId, $fromCurrencyId, $toCurrencyId, $dateString);
        return $rate === null ? $amount : (float) $amount * $rate;
    }

    public function dashboard(string $orgId, ?string $schoolId, ?string $targetCurrencyId = null): array
    {
        $baseCurrency = Currency::where('organization_id', $orgId);
        $schoolId === null ? $baseCurrency->whereNull('school_id') : $baseCurrency->where('school_id', $schoolId);
        $baseCurrency = $baseCurrency->where('is_base', true)->where('is_active', true)->whereNull('deleted_at')->first();
        $targetCurrencyId = $targetCurrencyId ?? $baseCurrency?->id;

        $currentMonthStart = date('Y-m-01');
        $currentMonthEnd = date('Y-m-t');

        $accountsQuery = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId)->where('is_active', true);
        $schoolId === null ? $accountsQuery->whereNull('school_id') : $accountsQuery->where('school_id', $schoolId);
        $accounts = $accountsQuery->get();

        $totalBalance = 0;
        $totalCashBalance = 0;
        foreach ($accounts as $account) {
            $cashIncome = $account->incomeEntries()->whereNull('deleted_at')->get()->sum(function ($e) use ($targetCurrencyId, $orgId, $schoolId) {
                $amt = (float) $e->amount;
                if ($targetCurrencyId && $e->currency_id && $e->currency_id !== $targetCurrencyId) {
                    $amt = $this->convertAmount($amt, $e->currency_id, $targetCurrencyId, $orgId, $schoolId, $e->date);
                }
                return $amt;
            });
            $cashExpense = $account->expenseEntries()->whereNull('deleted_at')->where('status', 'approved')->get()->sum(function ($e) use ($targetCurrencyId, $orgId, $schoolId) {
                $amt = (float) $e->amount;
                if ($targetCurrencyId && $e->currency_id && $e->currency_id !== $targetCurrencyId) {
                    $amt = $this->convertAmount($amt, $e->currency_id, $targetCurrencyId, $orgId, $schoolId, $e->date);
                }
                return $amt;
            });
            $opening = (float) $account->opening_balance;
            if ($targetCurrencyId && $account->currency_id && $account->currency_id !== $targetCurrencyId) {
                $opening = $this->convertAmount($opening, $account->currency_id, $targetCurrencyId, $orgId, $schoolId);
            }
            $totalCashBalance += $opening + $cashIncome - $cashExpense;
            $account->recalculateBalance();
            $bal = (float) $account->current_balance;
            if ($targetCurrencyId && $account->currency_id && $account->currency_id !== $targetCurrencyId) {
                $bal = $this->convertAmount($bal, $account->currency_id, $targetCurrencyId, $orgId, $schoolId);
            }
            $totalBalance += $bal;
        }

        $incomeQuery = IncomeEntry::whereNull('deleted_at')->where('organization_id', $orgId)->whereBetween('date', [$currentMonthStart, $currentMonthEnd]);
        $schoolId === null ? $incomeQuery->whereNull('school_id') : $incomeQuery->where('school_id', $schoolId);
        $currentMonthIncome = $incomeQuery->get()->sum(function ($e) use ($targetCurrencyId, $orgId, $schoolId) {
            $amt = (float) $e->amount;
            if ($targetCurrencyId && $e->currency_id && $e->currency_id !== $targetCurrencyId) {
                $amt = $this->convertAmount($amt, $e->currency_id, $targetCurrencyId, $orgId, $schoolId, $e->date);
            }
            return $amt;
        });

        $expenseQuery = ExpenseEntry::whereNull('deleted_at')->where('organization_id', $orgId)->where('status', 'approved')->whereBetween('date', [$currentMonthStart, $currentMonthEnd]);
        $schoolId === null ? $expenseQuery->whereNull('school_id') : $expenseQuery->where('school_id', $schoolId);
        $currentMonthExpense = $expenseQuery->get()->sum(function ($e) use ($targetCurrencyId, $orgId, $schoolId) {
            $amt = (float) $e->amount;
            if ($targetCurrencyId && $e->currency_id && $e->currency_id !== $targetCurrencyId) {
                $amt = $this->convertAmount($amt, $e->currency_id, $targetCurrencyId, $orgId, $schoolId, $e->date);
            }
            return $amt;
        });

        $projectsQuery = FinanceProject::whereNull('deleted_at')->where('organization_id', $orgId)->where('is_active', true)->where('status', 'active');
        $schoolId === null ? $projectsQuery->whereNull('school_id') : $projectsQuery->where('school_id', $schoolId);
        $activeProjects = $projectsQuery->count();

        $donorsQuery = Donor::whereNull('deleted_at')->where('organization_id', $orgId)->where('is_active', true);
        $schoolId === null ? $donorsQuery->whereNull('school_id') : $donorsQuery->where('school_id', $schoolId);
        $activeDonors = $donorsQuery->count();

        $accountsForList = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId)->where('is_active', true);
        $schoolId === null ? $accountsForList->whereNull('school_id') : $accountsForList->where('school_id', $schoolId);
        $accountBalances = $accountsForList->orderBy('name')->get()->map(function ($account) use ($targetCurrencyId, $orgId, $schoolId) {
            $account->recalculateBalance();
            $balance = (float) $account->current_balance;
            if ($targetCurrencyId && $account->currency_id && $account->currency_id !== $targetCurrencyId) {
                $balance = $this->convertAmount($balance, $account->currency_id, $targetCurrencyId, $orgId, $schoolId);
            }
            return ['id' => $account->id, 'name' => $account->name, 'current_balance' => $balance, 'type' => $account->type];
        });

        $recentIncomeQuery = IncomeEntry::whereNull('deleted_at')->where('organization_id', $orgId)->with(['account', 'incomeCategory', 'project', 'donor']);
        $schoolId === null ? $recentIncomeQuery->whereNull('school_id') : $recentIncomeQuery->where('school_id', $schoolId);
        $recentIncome = $recentIncomeQuery->orderBy('date', 'desc')->orderBy('created_at', 'desc')->limit(10)->get();

        $recentExpenseQuery = ExpenseEntry::whereNull('deleted_at')->where('organization_id', $orgId)->where('status', 'approved')->with(['account', 'expenseCategory', 'project']);
        $schoolId === null ? $recentExpenseQuery->whereNull('school_id') : $recentExpenseQuery->where('school_id', $schoolId);
        $recentExpenses = $recentExpenseQuery->orderBy('date', 'desc')->orderBy('created_at', 'desc')->limit(10)->get();

        // Income by category (current month)
        $incomeByCatQuery = IncomeEntry::whereNull('income_entries.deleted_at')->where('income_entries.organization_id', $orgId)->whereBetween('income_entries.date', [$currentMonthStart, $currentMonthEnd]);
        $schoolId === null ? $incomeByCatQuery->whereNull('income_entries.school_id') : $incomeByCatQuery->where('income_entries.school_id', $schoolId);
        $incomeByCategory = $incomeByCatQuery->join('income_categories', 'income_entries.income_category_id', '=', 'income_categories.id')->whereNull('income_categories.deleted_at')
            ->groupBy('income_categories.id', 'income_categories.name', 'income_categories.code')
            ->select('income_categories.id', 'income_categories.name', 'income_categories.code', DB::raw('SUM(income_entries.amount) as total'), DB::raw('COUNT(income_entries.id) as count'))
            ->orderByDesc('total')->get();

        // Expense by category (current month)
        $expenseByCatQuery = ExpenseEntry::whereNull('expense_entries.deleted_at')->where('expense_entries.organization_id', $orgId)->where('expense_entries.status', 'approved')->whereBetween('expense_entries.date', [$currentMonthStart, $currentMonthEnd]);
        $schoolId === null ? $expenseByCatQuery->whereNull('expense_entries.school_id') : $expenseByCatQuery->where('expense_entries.school_id', $schoolId);
        $expenseByCategory = $expenseByCatQuery->join('expense_categories', 'expense_entries.expense_category_id', '=', 'expense_categories.id')->whereNull('expense_categories.deleted_at')
            ->groupBy('expense_categories.id', 'expense_categories.name', 'expense_categories.code')
            ->select('expense_categories.id', 'expense_categories.name', 'expense_categories.code', DB::raw('SUM(expense_entries.amount) as total'), DB::raw('COUNT(expense_entries.id) as count'))
            ->orderByDesc('total')->get();

        return [
            'summary' => [
                'total_balance' => $totalBalance,
                'total_cash_balance' => $totalCashBalance,
                'current_month_income' => $currentMonthIncome,
                'current_month_expense' => $currentMonthExpense,
                'net_this_month' => $currentMonthIncome - $currentMonthExpense,
                'active_projects' => $activeProjects,
                'active_donors' => $activeDonors,
                'total_assets_value' => 0,
                'total_library_books_value' => 0,
            ],
            'account_balances' => $accountBalances->toArray(),
            'income_by_category' => $incomeByCategory->toArray(),
            'expense_by_category' => $expenseByCategory->toArray(),
            'recent_income' => $recentIncome->toArray(),
            'recent_expenses' => $recentExpenses->toArray(),
        ];
    }

    public function dailyCashbook(string $orgId, ?string $schoolId, string $date, ?string $accountId = null, ?string $targetCurrencyId = null): array
    {
        $accountsQuery = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId)->where('is_active', true);
        $schoolId === null ? $accountsQuery->whereNull('school_id') : $accountsQuery->where('school_id', $schoolId);
        if ($accountId) {
            $accountsQuery->where('id', $accountId);
        }
        $accounts = $accountsQuery->get();
        $cashbook = [];
        foreach ($accounts as $account) {
            $incomeBefore = IncomeEntry::whereNull('deleted_at')->where('organization_id', $orgId)->where('account_id', $account->id)->where('date', '<', $date);
            $schoolId === null ? $incomeBefore->whereNull('school_id') : $incomeBefore->where('school_id', $schoolId);
            $incomeBefore = $incomeBefore->sum('amount');

            $expenseBefore = ExpenseEntry::whereNull('deleted_at')->where('organization_id', $orgId)->where('account_id', $account->id)->where('status', 'approved')->where('date', '<', $date);
            $schoolId === null ? $expenseBefore->whereNull('school_id') : $expenseBefore->where('school_id', $schoolId);
            $expenseBefore = $expenseBefore->sum('amount');

            $openingBalance = (float) $account->opening_balance + $incomeBefore - $expenseBefore;

            $dayIncomeQuery = IncomeEntry::whereNull('deleted_at')->where('organization_id', $orgId)->where('account_id', $account->id)->where('date', $date)->with(['incomeCategory', 'donor']);
            $schoolId === null ? $dayIncomeQuery->whereNull('school_id') : $dayIncomeQuery->where('school_id', $schoolId);
            $dayIncome = $dayIncomeQuery->get();
            $totalDayIncome = $dayIncome->sum('amount');

            $dayExpensesQuery = ExpenseEntry::whereNull('deleted_at')->where('organization_id', $orgId)->where('account_id', $account->id)->where('status', 'approved')->where('date', $date)->with(['expenseCategory']);
            $schoolId === null ? $dayExpensesQuery->whereNull('school_id') : $dayExpensesQuery->where('school_id', $schoolId);
            $dayExpenses = $dayExpensesQuery->get();
            $totalDayExpense = $dayExpenses->sum('amount');

            $cashbook[] = [
                'account' => ['id' => $account->id, 'name' => $account->name, 'type' => $account->type],
                'opening_balance' => $openingBalance,
                'income' => $dayIncome,
                'total_income' => $totalDayIncome,
                'expenses' => $dayExpenses,
                'total_expense' => $totalDayExpense,
                'closing_balance' => $openingBalance + $totalDayIncome - $totalDayExpense,
            ];
        }
        return ['date' => $date, 'cashbook' => $cashbook];
    }

    public function incomeVsExpense(string $orgId, ?string $schoolId, ?string $dateFrom = null, ?string $dateTo = null, ?string $targetCurrencyId = null): array
    {
        $dateFrom = $dateFrom ?? date('Y-m-01');
        $dateTo = $dateTo ?? date('Y-m-t');

        $incomeQuery = IncomeEntry::whereNull('income_entries.deleted_at')->where('income_entries.organization_id', $orgId)->whereBetween('income_entries.date', [$dateFrom, $dateTo]);
        $schoolId === null ? $incomeQuery->whereNull('income_entries.school_id') : $incomeQuery->where('income_entries.school_id', $schoolId);
        $incomeByCategory = $incomeQuery->join('income_categories', 'income_entries.income_category_id', '=', 'income_categories.id')->whereNull('income_categories.deleted_at')
            ->groupBy('income_categories.id', 'income_categories.name', 'income_categories.code')
            ->select('income_categories.id', 'income_categories.name', 'income_categories.code', DB::raw('SUM(income_entries.amount) as total'), DB::raw('COUNT(income_entries.id) as count'))
            ->orderByDesc('total')->get();
        $totalIncome = $incomeByCategory->sum('total');

        $expenseQuery = ExpenseEntry::whereNull('expense_entries.deleted_at')->where('expense_entries.organization_id', $orgId)->where('expense_entries.status', 'approved')->whereBetween('expense_entries.date', [$dateFrom, $dateTo]);
        $schoolId === null ? $expenseQuery->whereNull('expense_entries.school_id') : $expenseQuery->where('expense_entries.school_id', $schoolId);
        $expenseByCategory = $expenseQuery->join('expense_categories', 'expense_entries.expense_category_id', '=', 'expense_categories.id')->whereNull('expense_categories.deleted_at')
            ->groupBy('expense_categories.id', 'expense_categories.name', 'expense_categories.code')
            ->select('expense_categories.id', 'expense_categories.name', 'expense_categories.code', DB::raw('SUM(expense_entries.amount) as total'), DB::raw('COUNT(expense_entries.id) as count'))
            ->orderByDesc('total')->get();
        $totalExpense = $expenseByCategory->sum('total');

        return [
            'period' => ['start_date' => $dateFrom, 'end_date' => $dateTo],
            'summary' => ['total_income' => $totalIncome, 'total_expense' => $totalExpense, 'net' => $totalIncome - $totalExpense],
            'income_by_category' => $incomeByCategory,
            'expense_by_category' => $expenseByCategory,
        ];
    }

    public function projectSummary(string $orgId, ?string $schoolId, ?string $targetCurrencyId = null, ?string $status = null): array
    {
        $query = FinanceProject::whereNull('deleted_at')->where('organization_id', $orgId);
        $schoolId === null ? $query->whereNull('school_id') : $query->where('school_id', $schoolId);
        if ($status !== null && $status !== '') {
            $query->where('status', $status);
        }
        $projects = $query->orderBy('name')->get();
        $projectSummaries = [];
        foreach ($projects as $project) {
            $iq = $project->incomeEntries()->whereNull('deleted_at');
            $schoolId === null ? $iq->whereNull('school_id') : $iq->where('school_id', $schoolId);
            $totalIncome = $iq->sum('amount');
            $eq = $project->expenseEntries()->whereNull('deleted_at')->where('status', 'approved');
            $schoolId === null ? $eq->whereNull('school_id') : $eq->where('school_id', $schoolId);
            $totalExpense = $eq->sum('amount');
            $projectSummaries[] = [
                'project' => $project,
                'total_income' => $totalIncome,
                'total_expense' => $totalExpense,
                'balance' => $totalIncome - $totalExpense,
                'budget_remaining' => $project->budget_amount ? $project->budget_amount - $totalExpense : null,
                'budget_utilization' => $project->budget_amount > 0 ? round((float) ($totalExpense / $project->budget_amount) * 100, 2) : null,
            ];
        }
        return ['projects' => $projectSummaries];
    }

    public function donorSummary(string $orgId, ?string $schoolId, ?string $targetCurrencyId = null, ?string $startDate = null, ?string $endDate = null): array
    {
        $query = Donor::whereNull('deleted_at')->where('organization_id', $orgId)->where('is_active', true);
        $schoolId === null ? $query->whereNull('school_id') : $query->where('school_id', $schoolId);
        $donors = $query->orderBy('name')->get();
        $donorSummaries = [];
        foreach ($donors as $donor) {
            $incomeQuery = $donor->incomeEntries()->whereNull('deleted_at');
            $schoolId === null ? $incomeQuery->whereNull('school_id') : $incomeQuery->where('school_id', $schoolId);
            if ($startDate && $endDate) {
                $incomeQuery->whereBetween('date', [$startDate, $endDate]);
            }
            $periodTotal = $incomeQuery->sum('amount');
            $donationCountQuery = $donor->incomeEntries()->whereNull('deleted_at');
            $schoolId === null ? $donationCountQuery->whereNull('school_id') : $donationCountQuery->where('school_id', $schoolId);
            if ($startDate && $endDate) {
                $donationCountQuery->whereBetween('date', [$startDate, $endDate]);
            }
            $donationCount = $donationCountQuery->count();
            $donor->recalculateTotalDonated();
            $donorSummaries[] = [
                'donor' => $donor,
                'total_donated' => $donor->total_donated,
                'period_total' => $periodTotal,
                'donation_count' => $donationCount,
            ];
        }
        usort($donorSummaries, fn ($a, $b) => $b['total_donated'] <=> $a['total_donated']);
        return [
            'period' => ['start_date' => $startDate, 'end_date' => $endDate],
            'donors' => $donorSummaries,
        ];
    }

    public function accountBalances(string $orgId, ?string $schoolId, ?string $targetCurrencyId = null): array
    {
        $query = FinanceAccount::whereNull('deleted_at')->where('organization_id', $orgId);
        $schoolId === null ? $query->whereNull('school_id') : $query->where('school_id', $schoolId);
        $accounts = $query->orderBy('name')->get();
        $accountSummaries = [];
        $totalBalance = 0;
        foreach ($accounts as $account) {
            $account->recalculateBalance();
            $iq = $account->incomeEntries()->whereNull('deleted_at');
            $schoolId === null ? $iq->whereNull('school_id') : $iq->where('school_id', $schoolId);
            $totalIncome = $iq->sum('amount');
            $eq = $account->expenseEntries()->whereNull('deleted_at')->where('status', 'approved');
            $schoolId === null ? $eq->whereNull('school_id') : $eq->where('school_id', $schoolId);
            $totalExpense = $eq->sum('amount');
            $accountSummaries[] = [
                'account' => $account,
                'opening_balance' => $account->opening_balance,
                'total_income' => $totalIncome,
                'total_expense' => $totalExpense,
                'current_balance' => $account->current_balance,
            ];
            if ($account->is_active) {
                $totalBalance += (float) ($account->current_balance ?? 0);
            }
        }
        return ['accounts' => $accountSummaries, 'total_balance' => $totalBalance];
    }
}
