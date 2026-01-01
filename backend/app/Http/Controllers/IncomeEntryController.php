<?php

namespace App\Http\Controllers;

use App\Models\IncomeEntry;
use App\Models\FinanceAccount;
use App\Models\IncomeCategory;
use App\Models\FinanceProject;
use App\Models\Donor;
use App\Models\ExchangeRate;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class IncomeEntryController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}
    /**
     * Display a listing of income entries
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
                if (!$user->hasPermissionTo('finance_income.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_income.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'account_id' => 'nullable|uuid|exists:finance_accounts,id',
                'income_category_id' => 'nullable|uuid|exists:income_categories,id',
                'project_id' => 'nullable|uuid|exists:finance_projects,id',
                'donor_id' => 'nullable|uuid|exists:donors,id',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'search' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $query = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->with(['account', 'incomeCategory', 'project', 'donor', 'receivedBy', 'currency']);

            if (!empty($validated['account_id'])) {
                $query->where('account_id', $validated['account_id']);
            }

            if (!empty($validated['income_category_id'])) {
                $query->where('income_category_id', $validated['income_category_id']);
            }

            if (!empty($validated['project_id'])) {
                $query->where('project_id', $validated['project_id']);
            }

            if (!empty($validated['donor_id'])) {
                $query->where('donor_id', $validated['donor_id']);
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
                      ->orWhere('description', 'ILIKE', "%{$search}%");
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
            \Log::error('IncomeEntryController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching income entries'], 500);
        }
    }

    /**
     * Store a newly created income entry
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
                if (!$user->hasPermissionTo('finance_income.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'account_id' => 'required|uuid|exists:finance_accounts,id',
                'income_category_id' => 'required|uuid|exists:income_categories,id',
                'currency_id' => 'nullable|uuid|exists:currencies,id',
                'amount' => 'required|numeric|min:0.01',
                'date' => 'required|date',
                'project_id' => 'nullable|uuid|exists:finance_projects,id',
                'donor_id' => 'nullable|uuid|exists:donors,id',
                'reference_no' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
            ]);

            // Verify account belongs to organization
            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($validated['account_id']);

            if (!$account) {
                return response()->json(['error' => 'Invalid account - does not belong to your organization'], 400);
            }

            // ALWAYS set currency_id - default to account's currency or base currency if not provided
            // This ensures historical transactions maintain their currency even if base currency changes
            $currencyId = $validated['currency_id'] ?? null;
            if (!$currencyId) {
                // Try account's currency first
                $currencyId = $account->currency_id;

                // If account has no currency, use base currency
                if (!$currencyId) {
                    $baseCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                            ->where('school_id', $currentSchoolId)
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
                ->where('school_id', $currentSchoolId)
                ->find($currencyId);

            if (!$currency) {
                return response()->json(['error' => 'Invalid currency - does not belong to your organization'], 400);
            }

            // Validate exchange rate if entry currency differs from account currency
            if ($account->currency_id && $currencyId !== $account->currency_id) {
                $rate = ExchangeRate::getRate(
                    $profile->organization_id,
                    $currentSchoolId,
                    $currencyId,
                    $account->currency_id,
                    $validated['date']
                );

                if ($rate === null) {
                    $fromCurrencyName = $currency->name ?? $currency->code ?? 'Unknown';
                    $toCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->find($account->currency_id);
                    $toCurrencyName = $toCurrency ? ($toCurrency->name ?? $toCurrency->code ?? 'Unknown') : 'Unknown';
                    return response()->json([
                        'error' => "Exchange rate not found for converting from {$fromCurrencyName} to {$toCurrencyName} on {$validated['date']}"
                    ], 422);
                }
            }

            // Verify income category belongs to organization
            $category = IncomeCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($validated['income_category_id']);

            if (!$category) {
                return response()->json(['error' => 'Invalid income category - does not belong to your organization'], 400);
            }

            // Verify project belongs to organization (if provided)
            if (!empty($validated['project_id'])) {
                $project = FinanceProject::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->find($validated['project_id']);

                if (!$project) {
                    return response()->json(['error' => 'Invalid project - does not belong to your organization'], 400);
                }
            }

            // Verify donor belongs to organization (if provided)
            if (!empty($validated['donor_id'])) {
                $donor = Donor::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->find($validated['donor_id']);

                if (!$donor) {
                    return response()->json(['error' => 'Invalid donor - does not belong to your organization'], 400);
                }
            }

            // Create income entry (model hooks will handle balance updates in transaction)
            $entry = IncomeEntry::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'currency_id' => $currencyId,
                'account_id' => $validated['account_id'],
                'income_category_id' => $validated['income_category_id'],
                'project_id' => $validated['project_id'] ?? null,
                'donor_id' => $validated['donor_id'] ?? null,
                'amount' => $validated['amount'],
                'date' => $validated['date'],
                'reference_no' => $validated['reference_no'] ?? null,
                'description' => $validated['description'] ?? null,
                'received_by_user_id' => $user->id,
                'payment_method' => $validated['payment_method'] ?? 'cash',
            ]);

            // Load relationships for response
            $entry->load(['account', 'incomeCategory', 'project', 'donor', 'receivedBy', 'currency']);

            // Send notification when payment is received (income entry created)
            try {
                $currencySymbol = $entry->currency->symbol ?? $entry->currency->code ?? '';
                $amountFormatted = number_format((float)$entry->amount, 2) . ' ' . $currencySymbol;
                $accountName = $entry->account->name ?? 'Account';
                $categoryName = $entry->incomeCategory->name ?? 'Income';
                $donorName = $entry->donor->name ?? null;
                $projectName = $entry->project->name ?? null;
                
                $bodyParts = ["Payment of {$amountFormatted} received"];
                if ($donorName) {
                    $bodyParts[] = "from {$donorName}";
                }
                if ($projectName) {
                    $bodyParts[] = "for project: {$projectName}";
                }
                $bodyParts[] = "in {$accountName}";
                $bodyParts[] = "({$categoryName})";
                
                $body = implode(' ', $bodyParts) . '.';
                
                $this->notificationService->notify(
                    'payment.received',
                    $entry,
                    $user,
                    [
                        'title' => '💰 Payment Received',
                        'body' => $body,
                        'url' => "/finance/income/{$entry->id}",
                        'exclude_actor' => false, // Include the creator so they see confirmation
                    ]
                );
            } catch (\Exception $e) {
                // Log error but don't fail the request
                Log::warning('Failed to send payment.received notification', [
                    'income_entry_id' => $entry->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json($entry, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('IncomeEntryController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating income entry'], 500);
        }
    }

    /**
     * Display the specified income entry
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
                if (!$user->hasPermissionTo('finance_income.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $entry = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->with(['account', 'incomeCategory', 'project', 'donor', 'receivedBy', 'currency'])
                ->find($id);

            if (!$entry) {
                return response()->json(['error' => 'Income entry not found'], 404);
            }

            return response()->json($entry);
        } catch (\Exception $e) {
            \Log::error('IncomeEntryController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching income entry'], 500);
        }
    }

    /**
     * Update the specified income entry
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
                if (!$user->hasPermissionTo('finance_income.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $entry = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$entry) {
                return response()->json(['error' => 'Income entry not found'], 404);
            }

            $validated = $request->validate([
                'account_id' => 'sometimes|uuid|exists:finance_accounts,id',
                'income_category_id' => 'sometimes|uuid|exists:income_categories,id',
                'currency_id' => 'nullable|uuid|exists:currencies,id',
                'amount' => 'sometimes|numeric|min:0.01',
                'date' => 'sometimes|date',
                'project_id' => 'nullable|uuid|exists:finance_projects,id',
                'donor_id' => 'nullable|uuid|exists:donors,id',
                'reference_no' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
            ]);

            // Verify account if changed
            if (!empty($validated['account_id'])) {
                $account = FinanceAccount::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->find($validated['account_id']);

                if (!$account) {
                    return response()->json(['error' => 'Invalid account - does not belong to your organization'], 400);
                }
            }

            // Verify income category if changed
            if (!empty($validated['income_category_id'])) {
                $category = IncomeCategory::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->find($validated['income_category_id']);

                if (!$category) {
                    return response()->json(['error' => 'Invalid income category - does not belong to your organization'], 400);
                }
            }

            // Verify project if changed
            if (array_key_exists('project_id', $validated) && $validated['project_id'] !== null) {
                $project = FinanceProject::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->find($validated['project_id']);

                if (!$project) {
                    return response()->json(['error' => 'Invalid project - does not belong to your organization'], 400);
                }
            }

            // Verify donor if changed
            if (array_key_exists('donor_id', $validated) && $validated['donor_id'] !== null) {
                $donor = Donor::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->find($validated['donor_id']);

                if (!$donor) {
                    return response()->json(['error' => 'Invalid donor - does not belong to your organization'], 400);
                }
            }

            // Handle currency_id - ALWAYS ensure it's set (never allow NULL)
            if (array_key_exists('currency_id', $validated)) {
                $currencyId = $validated['currency_id'];

                // If currency_id is explicitly set to null, try to get from account or base currency
                if (!$currencyId) {
                    $account = $entry->account;
                    $currencyId = $account->currency_id;

                    if (!$currencyId) {
                        $baseCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                            ->where('school_id', $currentSchoolId)
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
                    ->where('school_id', $currentSchoolId)
                    ->find($currencyId);

                if (!$currency) {
                    return response()->json(['error' => 'Invalid currency - does not belong to your organization'], 400);
                }

                // Get account for exchange rate validation
                $accountForValidation = !empty($validated['account_id']) 
                    ? FinanceAccount::whereNull('deleted_at')
                        ->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->find($validated['account_id'])
                    : $entry->account;

                // Validate exchange rate if entry currency differs from account currency
                if ($accountForValidation && $accountForValidation->currency_id && $currencyId !== $accountForValidation->currency_id) {
                    $entryDate = $validated['date'] ?? $entry->date->toDateString();
                    $rate = ExchangeRate::getRate(
                        $profile->organization_id,
                        $currentSchoolId,
                        $currencyId,
                        $accountForValidation->currency_id,
                        $entryDate
                    );

                    if ($rate === null) {
                        $fromCurrencyName = $currency->name ?? $currency->code ?? 'Unknown';
                        $toCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                            ->where('school_id', $currentSchoolId)
                            ->whereNull('deleted_at')
                            ->find($accountForValidation->currency_id);
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
                    $account = $entry->account;
                    $currencyId = $account->currency_id;

                    if (!$currencyId) {
                        $baseCurrency = \App\Models\Currency::where('organization_id', $profile->organization_id)
                            ->where('school_id', $currentSchoolId)
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

            // Track amount change for notifications
            $oldAmount = (float)$entry->amount;
            
            $entry->update($validated);
            $entry->load(['account', 'incomeCategory', 'project', 'donor', 'receivedBy', 'currency']);

            // Send notification for significant amount changes
            try {
                $newAmount = (float)($validated['amount'] ?? $entry->amount);
                $amountChanged = abs($newAmount - $oldAmount) > 0.01;
                
                if ($amountChanged && abs(($newAmount - $oldAmount) / max($oldAmount, 1)) > 0.1) {
                    // Notify if amount changed by more than 10%
                    $currencySymbol = $entry->currency->symbol ?? $entry->currency->code ?? '';
                    $oldAmountFormatted = number_format($oldAmount, 2) . ' ' . $currencySymbol;
                    $newAmountFormatted = number_format($newAmount, 2) . ' ' . $currencySymbol;
                    $accountName = $entry->account->name ?? 'Account';
                    
                    $this->notificationService->notify(
                        'payment.received',
                        $entry,
                        $user,
                        [
                            'title' => '📝 Payment Amount Updated',
                            'body' => "Payment amount in {$accountName} updated from {$oldAmountFormatted} to {$newAmountFormatted}.",
                            'url' => "/finance/income/{$entry->id}",
                            'exclude_actor' => false,
                        ]
                    );
                }
            } catch (\Exception $e) {
                Log::warning('Failed to send income update notification', [
                    'income_entry_id' => $entry->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json($entry);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('IncomeEntryController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating income entry'], 500);
        }
    }

    /**
     * Remove the specified income entry (soft delete)
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
                if (!$user->hasPermissionTo('finance_income.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $entry = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$entry) {
                return response()->json(['error' => 'Income entry not found'], 404);
            }

            $entry->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('IncomeEntryController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting income entry'], 500);
        }
    }
}
