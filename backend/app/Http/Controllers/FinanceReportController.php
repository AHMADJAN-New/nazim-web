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
use App\Models\Asset;
use App\Models\LibraryBook;
use App\Services\Reports\FinanceReportingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceReportController extends Controller
{
    public function __construct(
        private FinanceReportingService $reportingService
    ) {}

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

            // Allow reports.read (general) or finance_reports.read (accountant role)
            try {
                $canAccess = $user->hasPermissionTo('reports.read') || $user->hasPermissionTo('finance_reports.read');
                if (!$canAccess) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance dashboard: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $orgId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'target_currency_id' => 'nullable|uuid|exists:currencies,id',
            ]);
            $targetCurrencyId = $validated['target_currency_id'] ?? null;

            $data = $this->reportingService->dashboard($orgId, $currentSchoolId, $targetCurrencyId);

            // School-scoped: add assets, library books, recent_expenses, and adjust total_balance
            $recentExpenses = ExpenseEntry::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->where('status', 'approved')
                ->with(['expenseCategory'])
                ->orderBy('date', 'desc')
                ->limit(5)
                ->get();
            $data['recent_expenses'] = $recentExpenses->toArray();

            $totalAssetsValue = 0;
            $totalLibraryBooksValue = 0;
            $assetsByAccountArray = [];
            $assetsByCurrencyArray = [];
            $libraryBooksByAccountArray = [];
            $libraryBooksByCurrencyArray = [];

            $assets = Asset::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->whereIn('status', ['available', 'assigned', 'maintenance'])
                ->whereNotNull('purchase_price')
                ->whereNotNull('finance_account_id')
                ->with(['currency', 'financeAccount.currency'])
                ->get();

            $assetsByAccount = [];
            $assetsByCurrency = [];
            foreach ($assets as $asset) {
                $price = (float) $asset->purchase_price;
                if ($price <= 0) continue;
                $copies = max(1, (int) ($asset->total_copies ?? 1));
                $assetValue = $price * $copies;
                $assetCurrencyId = $asset->currency_id ?? ($asset->financeAccount?->currency_id ?? null) ?? $targetCurrencyId;
                $convertedPrice = $assetValue;
                if ($targetCurrencyId && $assetCurrencyId && $assetCurrencyId !== $targetCurrencyId) {
                    $convertedPrice = $this->convertAmount($assetValue, $assetCurrencyId, $targetCurrencyId, $orgId, $currentSchoolId, $asset->purchase_date ? $asset->purchase_date->toDateString() : null);
                }
                $totalAssetsValue += $convertedPrice;
                if ($asset->finance_account_id) {
                    $accountId = $asset->finance_account_id;
                    $accountName = $asset->financeAccount ? $asset->financeAccount->name : 'Unknown';
                    $currencyCode = $asset->currency ? $asset->currency->code : ($asset->financeAccount && $asset->financeAccount->currency ? $asset->financeAccount->currency->code : 'N/A');
                    $currencySymbol = $asset->currency ? $asset->currency->symbol : ($asset->financeAccount && $asset->financeAccount->currency ? $asset->financeAccount->currency->symbol : 'N/A');
                    if (!isset($assetsByAccount[$accountId])) {
                        $assetsByAccount[$accountId] = ['account_id' => $accountId, 'account_name' => $accountName, 'total_value' => 0, 'currency_code' => $currencyCode, 'currency_symbol' => $currencySymbol];
                    }
                    $assetsByAccount[$accountId]['total_value'] += $convertedPrice;
                }
                if ($assetCurrencyId) {
                    $currencyCode = $asset->currency ? $asset->currency->code : 'N/A';
                    if (!isset($assetsByCurrency[$assetCurrencyId])) {
                        $assetsByCurrency[$assetCurrencyId] = ['currency_id' => $assetCurrencyId, 'currency_code' => $currencyCode, 'total_value' => 0, 'converted_value' => 0];
                    }
                    $assetsByCurrency[$assetCurrencyId]['total_value'] += $assetValue;
                    $assetsByCurrency[$assetCurrencyId]['converted_value'] += $convertedPrice;
                }
            }
            $assetsByAccountArray = array_values($assetsByAccount);
            $assetsByCurrencyArray = array_values($assetsByCurrency);

            $libraryBooks = LibraryBook::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->where('price', '>', 0)
                ->whereNotNull('finance_account_id')
                ->with(['currency', 'financeAccount.currency'])
                ->withCount(['copies as total_copies' => function ($builder) { $builder->whereNull('deleted_at'); }])
                ->get();

            $libraryBooksByAccount = [];
            $libraryBooksByCurrency = [];
            foreach ($libraryBooks as $book) {
                $totalCopies = $book->total_copies ?? 0;
                if ($totalCopies <= 0) continue;
                $bookValue = (float) $book->price * $totalCopies;
                $bookCurrencyId = $book->currency_id ?? ($book->financeAccount?->currency_id ?? null) ?? $targetCurrencyId;
                $convertedValue = $bookValue;
                if ($targetCurrencyId && $bookCurrencyId && $bookCurrencyId !== $targetCurrencyId) {
                    $convertedValue = $this->convertAmount($bookValue, $bookCurrencyId, $targetCurrencyId, $orgId, $currentSchoolId, $book->created_at ? $book->created_at->toDateString() : null);
                }
                $totalLibraryBooksValue += $convertedValue;
                if ($book->finance_account_id) {
                    $accountId = $book->finance_account_id;
                    $accountName = $book->financeAccount ? $book->financeAccount->name : 'Unknown';
                    $currencyCode = $book->currency ? $book->currency->code : ($book->financeAccount && $book->financeAccount->currency ? $book->financeAccount->currency->code : 'N/A');
                    $currencySymbol = $book->currency ? $book->currency->symbol : ($book->financeAccount && $book->financeAccount->currency ? $book->financeAccount->currency->symbol : 'N/A');
                    if (!isset($libraryBooksByAccount[$accountId])) {
                        $libraryBooksByAccount[$accountId] = ['account_id' => $accountId, 'account_name' => $accountName, 'total_value' => 0, 'currency_code' => $currencyCode, 'currency_symbol' => $currencySymbol];
                    }
                    $libraryBooksByAccount[$accountId]['total_value'] += $convertedValue;
                }
                if ($bookCurrencyId) {
                    $currencyCode = $book->currency ? $book->currency->code : 'N/A';
                    if (!isset($libraryBooksByCurrency[$bookCurrencyId])) {
                        $libraryBooksByCurrency[$bookCurrencyId] = ['currency_id' => $bookCurrencyId, 'currency_code' => $currencyCode, 'total_value' => 0, 'converted_value' => 0];
                    }
                    $libraryBooksByCurrency[$bookCurrencyId]['total_value'] += $bookValue;
                    $libraryBooksByCurrency[$bookCurrencyId]['converted_value'] += $convertedValue;
                }
            }
            $libraryBooksByAccountArray = array_values($libraryBooksByAccount);
            $libraryBooksByCurrencyArray = array_values($libraryBooksByCurrency);

            $data['summary']['total_assets_value'] = $totalAssetsValue;
            $data['summary']['total_library_books_value'] = $totalLibraryBooksValue;
            $data['summary']['total_balance'] = $data['summary']['total_cash_balance'] + $totalAssetsValue + $totalLibraryBooksValue;
            $data['assets_by_account'] = $assetsByAccountArray;
            $data['assets_by_currency'] = $assetsByCurrencyArray;
            $data['library_books_by_account'] = $libraryBooksByAccountArray;
            $data['library_books_by_currency'] = $libraryBooksByCurrencyArray;

            return response()->json($data);
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
                'target_currency_id' => 'nullable|uuid|exists:currencies,id',
            ]);

            $orgId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $data = $this->reportingService->dailyCashbook(
                $orgId,
                $currentSchoolId,
                $validated['date'],
                $validated['account_id'] ?? null,
                $validated['target_currency_id'] ?? null
            );
            return response()->json($data);
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
            ]);

            $orgId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $data = $this->reportingService->incomeVsExpense(
                $orgId,
                $currentSchoolId,
                $validated['start_date'],
                $validated['end_date'],
                null
            );
            return response()->json($data);
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
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $data = $this->reportingService->projectSummary($orgId, $currentSchoolId, null, $validated['status'] ?? null);
            return response()->json($data);
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
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $data = $this->reportingService->donorSummary(
                $orgId,
                $currentSchoolId,
                null,
                $validated['start_date'] ?? null,
                $validated['end_date'] ?? null
            );
            return response()->json($data);
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
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $data = $this->reportingService->accountBalances($orgId, $currentSchoolId, null);
            return response()->json($data);
        } catch (\Exception $e) {
            \Log::error('FinanceReportController@accountBalances error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while generating account balances'], 500);
        }
    }

    /**
     * Convert amount from one currency to another
     */
    private function convertAmount($amount, $fromCurrencyId, $toCurrencyId, $organizationId, $schoolId, $date = null)
    {
        if (!$fromCurrencyId || !$toCurrencyId || $fromCurrencyId === $toCurrencyId) {
            return (float) $amount;
        }

        // Format date if provided
        $dateString = null;
        if ($date) {
            if (is_string($date)) {
                $dateString = $date;
            } elseif (is_object($date) && method_exists($date, 'format')) {
                $dateString = $date->format('Y-m-d');
            } else {
                $dateString = now()->toDateString();
            }
        }

        $rate = ExchangeRate::getRate($organizationId, $schoolId, $fromCurrencyId, $toCurrencyId, $dateString);

        if ($rate === null) {
            // If no rate found, return original amount (no conversion)
            return (float) $amount;
        }

        return (float) $amount * $rate;
    }
}
