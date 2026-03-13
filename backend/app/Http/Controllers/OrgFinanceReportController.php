<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use Illuminate\Http\Request;

class OrgFinanceReportController extends Controller
{
    use OrgFinanceScope;

    private function getReportingService(): ?\App\Services\Reports\FinanceReportingService
    {
        if (class_exists(\App\Services\Reports\FinanceReportingService::class)) {
            return app(\App\Services\Reports\FinanceReportingService::class);
        }
        return null;
    }

    public function dashboard(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'target_currency_id' => 'nullable|uuid|exists:currencies,id',
        ]);

        $service = $this->getReportingService();
        if ($service) {
            return response()->json($service->dashboard($orgId, null, $validated['target_currency_id'] ?? null));
        }

        return response()->json([
            'summary' => [
                'total_balance' => 0,
                'total_cash_balance' => 0,
                'current_month_income' => 0,
                'current_month_expense' => 0,
                'net_this_month' => 0,
                'active_projects' => 0,
                'active_donors' => 0,
                'total_assets_value' => 0,
                'total_library_books_value' => 0,
            ],
            'account_balances' => [],
            'income_by_category' => [],
            'expense_by_category' => [],
            'recent_income' => [],
        ]);
    }

    public function dailyCashbook(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'date' => 'nullable|date',
            'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'target_currency_id' => 'nullable|uuid|exists:currencies,id',
        ]);

        $service = $this->getReportingService();
        if ($service) {
            return response()->json($service->dailyCashbook(
                $orgId,
                null,
                $validated['date'] ?? now()->toDateString(),
                $validated['account_id'] ?? null,
                $validated['target_currency_id'] ?? null
            ));
        }

        return response()->json(['date' => $validated['date'] ?? now()->toDateString(), 'cashbook' => []]);
    }

    public function incomeVsExpense(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'target_currency_id' => 'nullable|uuid|exists:currencies,id',
        ]);

        $service = $this->getReportingService();
        if ($service) {
            return response()->json($service->incomeVsExpense(
                $orgId,
                null,
                $validated['date_from'] ?? null,
                $validated['date_to'] ?? null,
                $validated['target_currency_id'] ?? null
            ));
        }

        return response()->json([
            'period' => ['start_date' => $validated['date_from'] ?? null, 'end_date' => $validated['date_to'] ?? null],
            'summary' => ['total_income' => 0, 'total_expense' => 0, 'net' => 0],
            'income_by_category' => [],
            'expense_by_category' => [],
        ]);
    }

    public function projectSummary(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'target_currency_id' => 'nullable|uuid|exists:currencies,id',
            'status' => 'nullable|in:planning,active,completed,cancelled',
        ]);

        $service = $this->getReportingService();
        if ($service) {
            return response()->json($service->projectSummary($orgId, null, $validated['target_currency_id'] ?? null, $validated['status'] ?? null));
        }

        return response()->json(['projects' => []]);
    }

    public function donorSummary(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'target_currency_id' => 'nullable|uuid|exists:currencies,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $service = $this->getReportingService();
        if ($service) {
            return response()->json($service->donorSummary(
                $orgId,
                null,
                $validated['target_currency_id'] ?? null,
                $validated['start_date'] ?? null,
                $validated['end_date'] ?? null
            ));
        }

        return response()->json(['period' => ['start_date' => null, 'end_date' => null], 'donors' => []]);
    }

    public function accountBalances(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'target_currency_id' => 'nullable|uuid|exists:currencies,id',
        ]);

        $service = $this->getReportingService();
        if ($service) {
            return response()->json($service->accountBalances($orgId, null, $validated['target_currency_id'] ?? null));
        }

        return response()->json(['accounts' => [], 'total_balance' => 0]);
    }
}
