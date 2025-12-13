<?php

namespace App\Http\Controllers;

use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CurrencyController extends Controller
{
    /**
     * Display a listing of currencies
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
                if (!$user->hasPermissionTo('currencies.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for currencies.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'is_active' => 'nullable|boolean',
                'is_base' => 'nullable|boolean',
            ]);

            $query = Currency::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            if (isset($validated['is_base'])) {
                $query->where('is_base', filter_var($validated['is_base'], FILTER_VALIDATE_BOOLEAN));
            }

            $currencies = $query->orderBy('is_base', 'desc')->orderBy('code')->get();

            return response()->json($currencies);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('CurrencyController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching currencies'], 500);
        }
    }

    /**
     * Store a newly created currency
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
                if (!$user->hasPermissionTo('currencies.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for currencies.create: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'code' => [
                    'required',
                    'string',
                    'size:3',
                    'uppercase',
                    Rule::unique('currencies')->where(function ($query) use ($profile) {
                        return $query->where('organization_id', $profile->organization_id)->whereNull('deleted_at');
                    })
                ],
                'name' => 'required|string|max:100',
                'symbol' => 'nullable|string|max:10',
                'decimal_places' => 'nullable|integer|min:0|max:6',
                'is_base' => 'nullable|boolean',
                'is_active' => 'nullable|boolean',
            ]);

            $currency = Currency::create([
                'organization_id' => $profile->organization_id,
                'code' => strtoupper($validated['code']),
                'name' => trim($validated['name']),
                'symbol' => $validated['symbol'] ?? null,
                'decimal_places' => $validated['decimal_places'] ?? 2,
                'is_base' => $validated['is_base'] ?? false,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            return response()->json($currency, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('CurrencyController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating currency'], 500);
        }
    }

    /**
     * Display the specified currency
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
                if (!$user->hasPermissionTo('currencies.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currency = Currency::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$currency) {
                return response()->json(['error' => 'Currency not found'], 404);
            }

            return response()->json($currency);
        } catch (\Exception $e) {
            \Log::error('CurrencyController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching currency'], 500);
        }
    }

    /**
     * Update the specified currency
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
                if (!$user->hasPermissionTo('currencies.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currency = Currency::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$currency) {
                return response()->json(['error' => 'Currency not found'], 404);
            }

            $validated = $request->validate([
                'code' => [
                    'sometimes',
                    'string',
                    'size:3',
                    'uppercase',
                    Rule::unique('currencies')->where(function ($query) use ($profile) {
                        return $query->where('organization_id', $profile->organization_id)->whereNull('deleted_at');
                    })->ignore($id)
                ],
                'name' => 'sometimes|string|max:100',
                'symbol' => 'nullable|string|max:10',
                'decimal_places' => 'nullable|integer|min:0|max:6',
                'is_base' => 'nullable|boolean',
                'is_active' => 'nullable|boolean',
            ]);

            if (isset($validated['code'])) {
                $validated['code'] = strtoupper($validated['code']);
            }

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            $currency->update($validated);

            return response()->json($currency);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('CurrencyController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating currency'], 500);
        }
    }

    /**
     * Remove the specified currency (soft delete)
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
                if (!$user->hasPermissionTo('currencies.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currency = Currency::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$currency) {
                return response()->json(['error' => 'Currency not found'], 404);
            }

            // Check if currency is base currency
            if ($currency->is_base) {
                return response()->json(['error' => 'Cannot delete base currency. Please set another currency as base first.'], 409);
            }

            // Check if currency is in use
            $inUse = DB::table('finance_accounts')
                ->where('currency_id', $id)
                ->whereNull('deleted_at')
                ->exists()
                || DB::table('income_entries')
                ->where('currency_id', $id)
                ->whereNull('deleted_at')
                ->exists()
                || DB::table('expense_entries')
                ->where('currency_id', $id)
                ->whereNull('deleted_at')
                ->exists()
                || DB::table('finance_projects')
                ->where('currency_id', $id)
                ->whereNull('deleted_at')
                ->exists();

            if ($inUse) {
                return response()->json(['error' => 'Cannot delete currency that is in use'], 409);
            }

            $currency->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('CurrencyController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting currency'], 500);
        }
    }
}
