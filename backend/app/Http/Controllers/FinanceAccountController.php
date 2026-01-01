<?php

namespace App\Http\Controllers;

use App\Models\FinanceAccount;
use App\Models\Currency;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class FinanceAccountController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}
    /**
     * Display a listing of finance accounts
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
                if (!$user->hasPermissionTo('finance_accounts.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_accounts.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'type' => 'nullable|in:cash,fund',
                'is_active' => 'nullable|boolean',
            ]);

            $query = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId);

            if (!empty($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            $accounts = $query->with('currency')->orderBy('name')->get();
            
            // Recalculate balances to include assets before returning
            foreach ($accounts as $account) {
                $account->recalculateBalance();
            }

            return response()->json($accounts);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceAccountController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching finance accounts'], 500);
        }
    }

    /**
     * Store a newly created finance account
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
                if (!$user->hasPermissionTo('finance_accounts.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_accounts.create: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_accounts')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })],
                'type' => 'nullable|in:cash,fund',
                'currency_id' => 'nullable|uuid|exists:currencies,id',
                'description' => 'nullable|string',
                'opening_balance' => 'nullable|numeric|min:0',
                'is_active' => 'nullable|boolean',
            ]);

            // Verify currency belongs to organization if provided
            if (!empty($validated['currency_id'])) {
                $currency = Currency::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->find($validated['currency_id']);

                if (!$currency) {
                    return response()->json(['error' => 'Currency not found or does not belong to your organization'], 404);
                }
            }

            $account = FinanceAccount::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'currency_id' => $validated['currency_id'] ?? null,
                'name' => trim($validated['name']),
                'code' => $validated['code'] ?? null,
                'type' => $validated['type'] ?? 'cash',
                'description' => $validated['description'] ?? null,
                'opening_balance' => $validated['opening_balance'] ?? 0,
                'current_balance' => $validated['opening_balance'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $account->load('currency');

            return response()->json($account, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceAccountController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating finance account'], 500);
        }
    }

    /**
     * Display the specified finance account
     */
    public function show(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_accounts.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->with('currency')
                ->find($id);

            if (!$account) {
                return response()->json(['error' => 'Finance account not found'], 404);
            }

            // Recalculate balance to include assets before returning
            $account->recalculateBalance();

            return response()->json($account);
        } catch (\Exception $e) {
            \Log::error('FinanceAccountController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching finance account'], 500);
        }
    }

    /**
     * Update the specified finance account
     */
    public function update(Request $request, string $id)
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
                if (!$user->hasPermissionTo('finance_accounts.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$account) {
                return response()->json(['error' => 'Finance account not found'], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_accounts')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })->ignore($id)],
                'type' => 'nullable|in:cash,fund',
                'currency_id' => 'nullable|uuid|exists:currencies,id',
                'description' => 'nullable|string',
                'opening_balance' => 'nullable|numeric|min:0',
                'is_active' => 'nullable|boolean',
            ]);

            // Verify currency belongs to organization if being updated
            if (isset($validated['currency_id'])) {
                $currency = Currency::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->find($validated['currency_id']);

                if (!$currency) {
                    return response()->json(['error' => 'Currency not found or does not belong to your organization'], 404);
                }
            }

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            // If opening_balance changed, recalculate current_balance
            $oldOpeningBalance = $account->opening_balance;
            $account->update($validated);
            
            if (isset($validated['opening_balance']) && $validated['opening_balance'] != $oldOpeningBalance) {
                $account->recalculateBalance();
            }

            $account->load('currency');
            
            // Recalculate balance to include assets before returning
            $account->recalculateBalance();

            // Check for low balance warning (if balance is below 10% of opening balance or below a threshold)
            try {
                $openingBalance = $account->opening_balance ?? 0;
                $currentBalance = $account->current_balance ?? 0;
                $lowBalanceThreshold = max($openingBalance * 0.1, 100); // 10% of opening or 100, whichever is higher
                
                if ($currentBalance < $lowBalanceThreshold && $currentBalance >= 0) {
                    $currencySymbol = $account->currency->symbol ?? $account->currency->code ?? '';
                    $balanceFormatted = number_format($currentBalance, 2) . ' ' . $currencySymbol;
                    $thresholdFormatted = number_format($lowBalanceThreshold, 2) . ' ' . $currencySymbol;
                    
                    $this->notificationService->notify(
                        'invoice.overdue', // Using invoice.overdue for low balance warnings (it's a digest event)
                        $account,
                        $request->user(),
                        [
                            'title' => '⚠️ Low Account Balance Warning',
                            'body' => "Account '{$account->name}' has a low balance of {$balanceFormatted} (below threshold of {$thresholdFormatted}).",
                            'url' => "/finance/accounts/{$account->id}",
                            'level' => 'warning',
                            'exclude_actor' => false,
                        ]
                    );
                }
            } catch (\Exception $e) {
                // Log error but don't fail the request
                Log::warning('Failed to send low balance notification', [
                    'account_id' => $account->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json($account);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceAccountController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating finance account'], 500);
        }
    }

    /**
     * Remove the specified finance account (soft delete)
     */
    public function destroy(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_accounts.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$account) {
                return response()->json(['error' => 'Finance account not found'], 404);
            }

            // Check if account has any entries
            $hasIncome = $account->incomeEntries()->whereNull('deleted_at')->exists();
            $hasExpenses = $account->expenseEntries()->whereNull('deleted_at')->exists();

            if ($hasIncome || $hasExpenses) {
                return response()->json(['error' => 'Cannot delete account with existing entries'], 409);
            }

            $account->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('FinanceAccountController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting finance account'], 500);
        }
    }
}
