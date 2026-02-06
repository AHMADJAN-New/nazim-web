<?php

namespace App\Http\Controllers;

use App\Models\ExchangeRate;
use App\Models\Currency;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExchangeRateController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of exchange rates
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
                if (!$user->hasPermissionTo('exchange_rates.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for exchange_rates.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'from_currency_id' => 'nullable|uuid|exists:currencies,id',
                'to_currency_id' => 'nullable|uuid|exists:currencies,id',
                'effective_date' => 'nullable|date',
                'is_active' => 'nullable|boolean',
            ]);

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $query = ExchangeRate::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->with(['fromCurrency', 'toCurrency']);

            if (!empty($validated['from_currency_id'])) {
                $query->where('from_currency_id', $validated['from_currency_id']);
            }

            if (!empty($validated['to_currency_id'])) {
                $query->where('to_currency_id', $validated['to_currency_id']);
            }

            if (!empty($validated['effective_date'])) {
                $query->where('effective_date', $validated['effective_date']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            $rates = $query->orderBy('effective_date', 'desc')->orderBy('from_currency_id')->get();

            return response()->json($rates);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExchangeRateController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching exchange rates'], 500);
        }
    }

    /**
     * Store a newly created exchange rate
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
                if (!$user->hasPermissionTo('exchange_rates.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for exchange_rates.create: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'from_currency_id' => 'required|uuid|exists:currencies,id',
                'to_currency_id' => 'required|uuid|exists:currencies,id|different:from_currency_id',
                'rate' => 'required|numeric|min:0.000001',
                'effective_date' => 'required|date',
                'notes' => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Verify both currencies belong to the organization
            $fromCurrency = Currency::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->find($validated['from_currency_id']);

            $toCurrency = Currency::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->find($validated['to_currency_id']);

            if (!$fromCurrency || !$toCurrency) {
                return response()->json(['error' => 'One or both currencies not found or do not belong to your organization'], 404);
            }

            // Check for duplicate rate on same date
            $existing = ExchangeRate::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('from_currency_id', $validated['from_currency_id'])
                ->where('to_currency_id', $validated['to_currency_id'])
                ->where('effective_date', $validated['effective_date'])
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Exchange rate already exists for this currency pair and date'], 409);
            }

            $rate = ExchangeRate::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'from_currency_id' => $validated['from_currency_id'],
                'to_currency_id' => $validated['to_currency_id'],
                'rate' => $validated['rate'],
                'effective_date' => $validated['effective_date'],
                'notes' => $validated['notes'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $rate->load(['fromCurrency', 'toCurrency']);

            // Log exchange rate creation
            try {
                $fromCode = $rate->fromCurrency?->code ?? 'Unknown';
                $toCode = $rate->toCurrency?->code ?? 'Unknown';
                $this->activityLogService->logCreate(
                    subject: $rate,
                    description: "Created exchange rate: {$fromCode} to {$toCode} ({$rate->rate})",
                    properties: [
                        'rate_id' => $rate->id,
                        'from_currency_id' => $rate->from_currency_id,
                        'to_currency_id' => $rate->to_currency_id,
                        'rate' => $rate->rate,
                        'effective_date' => $rate->effective_date,
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log exchange rate creation: ' . $e->getMessage());
            }

            return response()->json($rate, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExchangeRateController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating exchange rate'], 500);
        }
    }

    /**
     * Display the specified exchange rate
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
                if (!$user->hasPermissionTo('exchange_rates.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $rate = ExchangeRate::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', request()->get('current_school_id'))
                ->with(['fromCurrency', 'toCurrency'])
                ->find($id);

            if (!$rate) {
                return response()->json(['error' => 'Exchange rate not found'], 404);
            }

            return response()->json($rate);
        } catch (\Exception $e) {
            \Log::error('ExchangeRateController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching exchange rate'], 500);
        }
    }

    /**
     * Update the specified exchange rate
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
                if (!$user->hasPermissionTo('exchange_rates.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $rate = ExchangeRate::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$rate) {
                return response()->json(['error' => 'Exchange rate not found'], 404);
            }

            // Capture old values for logging
            $oldValues = $rate->only(['from_currency_id', 'to_currency_id', 'rate', 'effective_date', 'is_active']);

            $validated = $request->validate([
                'from_currency_id' => 'sometimes|uuid|exists:currencies,id',
                'to_currency_id' => 'sometimes|uuid|exists:currencies,id|different:from_currency_id',
                'rate' => 'sometimes|numeric|min:0.000001',
                'effective_date' => 'sometimes|date',
                'notes' => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            // If currencies are being updated, verify they belong to organization
            if (isset($validated['from_currency_id']) || isset($validated['to_currency_id'])) {
                $fromCurrencyId = $validated['from_currency_id'] ?? $rate->from_currency_id;
                $toCurrencyId = $validated['to_currency_id'] ?? $rate->to_currency_id;

                $fromCurrency = Currency::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->find($fromCurrencyId);

                $toCurrency = Currency::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->find($toCurrencyId);

                if (!$fromCurrency || !$toCurrency) {
                    return response()->json(['error' => 'One or both currencies not found or do not belong to your organization'], 404);
                }
            }

            // Check for duplicate if date or currencies changed
            if (isset($validated['effective_date']) || isset($validated['from_currency_id']) || isset($validated['to_currency_id'])) {
                $effectiveDate = $validated['effective_date'] ?? $rate->effective_date;
                $fromCurrencyId = $validated['from_currency_id'] ?? $rate->from_currency_id;
                $toCurrencyId = $validated['to_currency_id'] ?? $rate->to_currency_id;

                $existing = ExchangeRate::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->where('from_currency_id', $fromCurrencyId)
                    ->where('to_currency_id', $toCurrencyId)
                    ->where('effective_date', $effectiveDate)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    return response()->json(['error' => 'Exchange rate already exists for this currency pair and date'], 409);
                }
            }

            $rate->update($validated);
            $rate->load(['fromCurrency', 'toCurrency']);

            // Log exchange rate update
            try {
                $fromCode = $rate->fromCurrency?->code ?? 'Unknown';
                $toCode = $rate->toCurrency?->code ?? 'Unknown';
                $this->activityLogService->logUpdate(
                    subject: $rate,
                    description: "Updated exchange rate: {$fromCode} to {$toCode} ({$rate->rate})",
                    properties: [
                        'old_values' => $oldValues,
                        'new_values' => $rate->only(['from_currency_id', 'to_currency_id', 'rate', 'effective_date', 'is_active']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log exchange rate update: ' . $e->getMessage());
            }

            return response()->json($rate);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExchangeRateController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating exchange rate'], 500);
        }
    }

    /**
     * Remove the specified exchange rate (soft delete)
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
                if (!$user->hasPermissionTo('exchange_rates.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $rate = ExchangeRate::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', request()->get('current_school_id'))
                ->find($id);

            if (!$rate) {
                return response()->json(['error' => 'Exchange rate not found'], 404);
            }

            $rateData = $rate->toArray();
            $fromCode = $rate->fromCurrency?->code ?? 'Unknown';
            $toCode = $rate->toCurrency?->code ?? 'Unknown';
            $rate->delete();

            // Log exchange rate deletion
            try {
                $this->activityLogService->logDelete(
                    subject: $rate,
                    description: "Deleted exchange rate: {$fromCode} to {$toCode}",
                    properties: ['deleted_rate' => $rateData],
                    request: request()
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log exchange rate deletion: ' . $e->getMessage());
            }

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('ExchangeRateController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting exchange rate'], 500);
        }
    }

    /**
     * Convert amount from one currency to another
     */
    public function convert(Request $request)
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

            $validated = $request->validate([
                'from_currency_id' => 'required|uuid|exists:currencies,id',
                'to_currency_id' => 'required|uuid|exists:currencies,id',
                'amount' => 'required|numeric|min:0',
                'date' => 'nullable|date',
            ]);

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $date = $validated['date'] ?? now()->toDateString();
            $rate = ExchangeRate::getRate(
                $profile->organization_id,
                $currentSchoolId,
                $validated['from_currency_id'],
                $validated['to_currency_id'],
                $date
            );

            if ($rate === null) {
                // Load currency names for better error message
                $fromCurrency = Currency::find($validated['from_currency_id']);
                $toCurrency = Currency::find($validated['to_currency_id']);
                $fromCurrencyName = $fromCurrency ? ($fromCurrency->name ?? $fromCurrency->code ?? 'Unknown') : 'Unknown';
                $toCurrencyName = $toCurrency ? ($toCurrency->name ?? $toCurrency->code ?? 'Unknown') : 'Unknown';
                
                return response()->json([
                    'error' => "Exchange rate not found for converting from {$fromCurrencyName} to {$toCurrencyName} on {$date}"
                ], 404);
            }

            $convertedAmount = $validated['amount'] * $rate;

            return response()->json([
                'from_currency_id' => $validated['from_currency_id'],
                'to_currency_id' => $validated['to_currency_id'],
                'amount' => $validated['amount'],
                'rate' => $rate,
                'converted_amount' => $convertedAmount,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExchangeRateController@convert error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while converting currency'], 500);
        }
    }
}
