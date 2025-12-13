<?php

namespace App\Http\Controllers;

use App\Models\IncomeEntry;
use App\Models\FinanceAccount;
use App\Models\IncomeCategory;
use App\Models\FinanceProject;
use App\Models\Donor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncomeEntryController extends Controller
{
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

            $validated = $request->validate([
                'school_id' => 'nullable|uuid|exists:school_branding,id',
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
                ->with(['account', 'incomeCategory', 'project', 'donor', 'receivedBy']);

            if (!empty($validated['school_id'])) {
                $query->where('school_id', $validated['school_id']);
            }

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

            $validated = $request->validate([
                'account_id' => 'required|uuid|exists:finance_accounts,id',
                'income_category_id' => 'required|uuid|exists:income_categories,id',
                'amount' => 'required|numeric|min:0.01',
                'date' => 'required|date',
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'project_id' => 'nullable|uuid|exists:finance_projects,id',
                'donor_id' => 'nullable|uuid|exists:donors,id',
                'reference_no' => 'nullable|string|max:100',
                'description' => 'nullable|string',
                'payment_method' => 'nullable|in:cash,bank_transfer,cheque,other',
            ]);

            // Verify account belongs to organization
            $account = FinanceAccount::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($validated['account_id']);

            if (!$account) {
                return response()->json(['error' => 'Invalid account - does not belong to your organization'], 400);
            }

            // Verify income category belongs to organization
            $category = IncomeCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($validated['income_category_id']);

            if (!$category) {
                return response()->json(['error' => 'Invalid income category - does not belong to your organization'], 400);
            }

            // Verify project belongs to organization (if provided)
            if (!empty($validated['project_id'])) {
                $project = FinanceProject::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['project_id']);

                if (!$project) {
                    return response()->json(['error' => 'Invalid project - does not belong to your organization'], 400);
                }
            }

            // Verify donor belongs to organization (if provided)
            if (!empty($validated['donor_id'])) {
                $donor = Donor::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['donor_id']);

                if (!$donor) {
                    return response()->json(['error' => 'Invalid donor - does not belong to your organization'], 400);
                }
            }

            // Create income entry (model hooks will handle balance updates in transaction)
            $entry = IncomeEntry::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $validated['school_id'] ?? null,
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
            $entry->load(['account', 'incomeCategory', 'project', 'donor', 'receivedBy']);

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

            $entry = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->with(['account', 'incomeCategory', 'project', 'donor', 'receivedBy'])
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

            $entry = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$entry) {
                return response()->json(['error' => 'Income entry not found'], 404);
            }

            $validated = $request->validate([
                'account_id' => 'sometimes|uuid|exists:finance_accounts,id',
                'income_category_id' => 'sometimes|uuid|exists:income_categories,id',
                'amount' => 'sometimes|numeric|min:0.01',
                'date' => 'sometimes|date',
                'school_id' => 'nullable|uuid|exists:school_branding,id',
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
                    ->find($validated['account_id']);

                if (!$account) {
                    return response()->json(['error' => 'Invalid account - does not belong to your organization'], 400);
                }
            }

            // Verify income category if changed
            if (!empty($validated['income_category_id'])) {
                $category = IncomeCategory::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['income_category_id']);

                if (!$category) {
                    return response()->json(['error' => 'Invalid income category - does not belong to your organization'], 400);
                }
            }

            // Verify project if changed
            if (array_key_exists('project_id', $validated) && $validated['project_id'] !== null) {
                $project = FinanceProject::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['project_id']);

                if (!$project) {
                    return response()->json(['error' => 'Invalid project - does not belong to your organization'], 400);
                }
            }

            // Verify donor if changed
            if (array_key_exists('donor_id', $validated) && $validated['donor_id'] !== null) {
                $donor = Donor::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->find($validated['donor_id']);

                if (!$donor) {
                    return response()->json(['error' => 'Invalid donor - does not belong to your organization'], 400);
                }
            }

            $entry->update($validated);
            $entry->load(['account', 'incomeCategory', 'project', 'donor', 'receivedBy']);

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

            $entry = IncomeEntry::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
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
