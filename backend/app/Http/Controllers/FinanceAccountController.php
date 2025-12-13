<?php

namespace App\Http\Controllers;

use App\Models\FinanceAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FinanceAccountController extends Controller
{
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

            $validated = $request->validate([
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'type' => 'nullable|in:cash,fund',
                'is_active' => 'nullable|boolean',
            ]);

            $query = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            if (!empty($validated['school_id'])) {
                $query->where('school_id', $validated['school_id']);
            }

            if (!empty($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            $accounts = $query->orderBy('name')->get();

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

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_accounts')->where(function ($query) use ($profile) {
                    return $query->where('organization_id', $profile->organization_id)->whereNull('deleted_at');
                })],
                'type' => 'nullable|in:cash,fund',
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'description' => 'nullable|string',
                'opening_balance' => 'nullable|numeric|min:0',
                'is_active' => 'nullable|boolean',
            ]);

            $account = FinanceAccount::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $validated['school_id'] ?? null,
                'name' => trim($validated['name']),
                'code' => $validated['code'] ?? null,
                'type' => $validated['type'] ?? 'cash',
                'description' => $validated['description'] ?? null,
                'opening_balance' => $validated['opening_balance'] ?? 0,
                'current_balance' => $validated['opening_balance'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
            ]);

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

            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$account) {
                return response()->json(['error' => 'Finance account not found'], 404);
            }

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

            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$account) {
                return response()->json(['error' => 'Finance account not found'], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_accounts')->where(function ($query) use ($profile) {
                    return $query->where('organization_id', $profile->organization_id)->whereNull('deleted_at');
                })->ignore($id)],
                'type' => 'nullable|in:cash,fund',
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'description' => 'nullable|string',
                'opening_balance' => 'nullable|numeric|min:0',
                'is_active' => 'nullable|boolean',
            ]);

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            // If opening_balance changed, recalculate current_balance
            $oldOpeningBalance = $account->opening_balance;
            $account->update($validated);
            
            if (isset($validated['opening_balance']) && $validated['opening_balance'] != $oldOpeningBalance) {
                $account->recalculateBalance();
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

            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
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
