<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\Currency;
use App\Models\ExchangeRate;
use Illuminate\Http\Request;

class OrgFinanceExchangeRateController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'from_currency_id' => 'nullable|uuid|exists:currencies,id',
            'to_currency_id' => 'nullable|uuid|exists:currencies,id',
            'effective_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        $query = ExchangeRate::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
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
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $validated = $request->validate([
            'from_currency_id' => 'required|uuid|exists:currencies,id',
            'to_currency_id' => 'required|uuid|exists:currencies,id|different:from_currency_id',
            'rate' => 'required|numeric|min:0.000001',
            'effective_date' => 'required|date',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $fromCurrency = Currency::where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')->find($validated['from_currency_id']);
        $toCurrency = Currency::where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')->find($validated['to_currency_id']);

        if (!$fromCurrency || !$toCurrency) {
            return response()->json(['error' => 'One or both currencies not found or must be org-level'], 404);
        }

        $existing = ExchangeRate::where('organization_id', $orgId)
            ->whereNull('school_id')
            ->where('from_currency_id', $validated['from_currency_id'])
            ->where('to_currency_id', $validated['to_currency_id'])
            ->where('effective_date', $validated['effective_date'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Exchange rate already exists for this currency pair and date'], 409);
        }

        $rate = ExchangeRate::create([
            'organization_id' => $orgId,
            'school_id' => null,
            'from_currency_id' => $validated['from_currency_id'],
            'to_currency_id' => $validated['to_currency_id'],
            'rate' => $validated['rate'],
            'effective_date' => $validated['effective_date'],
            'notes' => $validated['notes'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $rate->load(['fromCurrency', 'toCurrency']);
        return response()->json($rate, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $rate = ExchangeRate::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with(['fromCurrency', 'toCurrency'])
            ->find($id);

        if (!$rate) {
            return response()->json(['error' => 'Exchange rate not found'], 404);
        }

        return response()->json($rate);
    }

    public function convert(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'from_currency_id' => 'required|uuid|exists:currencies,id',
            'to_currency_id' => 'required|uuid|exists:currencies,id',
            'amount' => 'required|numeric|min:0',
            'date' => 'nullable|date',
        ]);

        $fromCurrency = Currency::where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')->find($validated['from_currency_id']);
        $toCurrency = Currency::where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')->find($validated['to_currency_id']);

        if (!$fromCurrency || !$toCurrency) {
            return response()->json(['error' => 'One or both currencies not found or must be org-level'], 404);
        }

        $date = $validated['date'] ?? now()->toDateString();
        $rate = ExchangeRate::getRate(
            $orgId,
            null,
            $validated['from_currency_id'],
            $validated['to_currency_id'],
            $date
        );

        if ($rate === null) {
            return response()->json([
                'from_currency_id' => $validated['from_currency_id'],
                'to_currency_id' => $validated['to_currency_id'],
                'amount' => (float) $validated['amount'],
                'rate' => null,
                'converted_amount' => (float) $validated['amount'],
                'converted' => false,
                'date' => $date,
                'message' => 'No exchange rate found for the given currency pair and date; amount shown in original currency.',
            ]);
        }

        $convertedAmount = (float) $validated['amount'] * (float) $rate;

        return response()->json([
            'from_currency_id' => $validated['from_currency_id'],
            'to_currency_id' => $validated['to_currency_id'],
            'amount' => (float) $validated['amount'],
            'rate' => (float) $rate,
            'converted_amount' => $convertedAmount,
            'converted' => true,
            'date' => $date,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $rate = ExchangeRate::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$rate) {
            return response()->json(['error' => 'Exchange rate not found'], 404);
        }

        $validated = $request->validate([
            'rate' => 'sometimes|numeric|min:0.000001',
            'effective_date' => 'sometimes|date',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $rate->update($validated);
        $rate->load(['fromCurrency', 'toCurrency']);
        return response()->json($rate);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $rate = ExchangeRate::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$rate) {
            return response()->json(['error' => 'Exchange rate not found'], 404);
        }

        $rate->delete();
        return response()->noContent();
    }
}
