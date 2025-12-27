<?php

namespace App\Http\Controllers;

use App\Models\StudentIdCard;
use App\Models\StudentAdmission;
use App\Models\IdCardTemplate;
use App\Models\IncomeEntry;
use App\Models\Currency;
use App\Models\FinanceAccount;
use App\Models\IncomeCategory;
use App\Services\IdCardExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StudentIdCardController extends Controller
{
    protected IdCardExportService $exportService;

    public function __construct(IdCardExportService $exportService)
    {
        $this->exportService = $exportService;
    }

    /**
     * Display a listing of student ID cards with filters
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];
        
        $query = StudentIdCard::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->forAccessibleSchools($schoolIds);

        // Filter by academic year
        if ($request->has('academic_year_id') && $request->academic_year_id) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        // Filter by class
        if ($request->has('class_id') && $request->class_id) {
            $query->where('class_id', $request->class_id);
        }

        // Filter by class academic year
        if ($request->has('class_academic_year_id') && $request->class_academic_year_id) {
            $query->where('class_academic_year_id', $request->class_academic_year_id);
        }

        // Client-provided school_id is ignored; current school is enforced.

        // Filter by template
        if ($request->has('template_id') && $request->template_id) {
            $query->where('id_card_template_id', $request->template_id);
        }

        // Filter by printed status
        if ($request->has('is_printed')) {
            $query->where('is_printed', filter_var($request->is_printed, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by fee paid status
        if ($request->has('card_fee_paid')) {
            $query->where('card_fee_paid', filter_var($request->card_fee_paid, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by enrollment status (via student_admissions)
        if ($request->has('enrollment_status') && $request->enrollment_status) {
            $query->whereHas('studentAdmission', function ($q) use ($request) {
                $q->where('enrollment_status', $request->enrollment_status);
            });
        }

        // Search by student name or admission number
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                  ->orWhere('admission_no', 'ilike', "%{$search}%");
            });
        }

        // Eager load relationships
        // Note: printedBy is NOT loaded to avoid UUID type mismatch errors
        $query->with([
            'student',
            'studentAdmission',
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'incomeEntry',
        ]);

        // Support pagination
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25;
            }
            
            $cards = $query->orderBy('created_at', 'desc')->paginate((int)$perPage);
            return response()->json($cards);
        }

        // Return all results if no pagination
        $cards = $query->orderBy('created_at', 'desc')->get();
        return response()->json($cards);
    }

    /**
     * Bulk assign ID card template to students
     */
    public function assign(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'academic_year_id' => 'required|uuid|exists:academic_years,id',
            'id_card_template_id' => 'required|uuid|exists:id_card_templates,id',
            'student_admission_ids' => 'required|array|min:1',
            'student_admission_ids.*' => 'required|uuid|exists:student_admissions,id',
            'class_id' => 'nullable|uuid|exists:classes,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'card_fee' => 'nullable|numeric|min:0',
            'card_fee_paid' => 'nullable|boolean',
            'card_fee_paid_date' => 'nullable|date|required_if:card_fee_paid,true',
            'account_id' => 'nullable|uuid|exists:finance_accounts,id|required_if:card_fee_paid,true',
            'income_category_id' => 'nullable|uuid|exists:income_categories,id|required_if:card_fee_paid,true',
        ]);

        // Verify template belongs to organization
        $template = IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('id', $validated['id_card_template_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Verify academic year belongs to organization
        $academicYear = DB::table('academic_years')
            ->where('id', $validated['academic_year_id'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
        }

        $created = [];
        $skipped = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($validated['student_admission_ids'] as $admissionId) {
                // Get student admission
                $admission = StudentAdmission::where('id', $admissionId)
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$admission) {
                    $skipped[] = [
                        'student_admission_id' => $admissionId,
                        'reason' => 'admission_not_found'
                    ];
                    continue;
                }

                // Check if card already exists for this admission and academic year
                $existing = StudentIdCard::where('student_admission_id', $admissionId)
                    ->where('academic_year_id', $validated['academic_year_id'])
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $skipped[] = [
                        'student_admission_id' => $admissionId,
                        'reason' => 'already_assigned',
                        'card_id' => $existing->id
                    ];
                    continue;
                }

                try {
                    $card = StudentIdCard::create([
                        'organization_id' => $profile->organization_id,
                        'school_id' => $admission->school_id, // Set school_id from admission
                        'student_id' => $admission->student_id,
                        'student_admission_id' => $admissionId,
                        'id_card_template_id' => $validated['id_card_template_id'],
                        'academic_year_id' => $validated['academic_year_id'],
                        'class_id' => $validated['class_id'] ?? $admission->class_id,
                        'class_academic_year_id' => $validated['class_academic_year_id'] ?? $admission->class_academic_year_id,
                        'card_fee' => $validated['card_fee'] ?? 0,
                        'card_fee_paid' => $validated['card_fee_paid'] ?? false,
                        'card_fee_paid_date' => ($validated['card_fee_paid'] ?? false) ? now() : null,
                    ]);

                    // Create income entry if fee is paid
                    if ($card->card_fee_paid && $card->card_fee > 0 && !empty($validated['account_id']) && !empty($validated['income_category_id'])) {
                        $this->createIncomeEntryForCard($card, $validated['account_id'], $validated['income_category_id'], $user->id);
                        // Refresh card to get income_entry_id
                        $card->refresh();
                    }

                    $created[] = $card->id;
                } catch (\Exception $e) {
                    $errors[] = [
                        'student_admission_id' => $admissionId,
                        'error' => $e->getMessage()
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk assignment completed',
                'created_count' => count($created),
                'skipped_count' => count($skipped),
                'error_count' => count($errors),
                'created' => $created,
                'skipped' => $skipped,
                'errors' => $errors,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Bulk ID card assignment failed: " . $e->getMessage());
            return response()->json(['error' => 'Bulk assignment failed', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified ID card
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $card = StudentIdCard::with([
            'student',
            'studentAdmission',
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'incomeEntry',
        ])
        ->whereNull('deleted_at')
        ->find($id);
        
        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }
        
        // Note: printedBy relationship is not loaded to avoid UUID type mismatch errors

        // Check organization access
        if ($card->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        return response()->json($card);
    }

    /**
     * Update the specified ID card
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $card = StudentIdCard::whereNull('deleted_at')->find($id);

        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        // Check organization access
        if ($card->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update ID card from different organization'], 403);
        }

        $validated = $request->validate([
            'card_number' => 'nullable|string|max:50',
            'card_fee' => 'nullable|numeric|min:0',
            'card_fee_paid' => 'nullable|boolean',
            'card_fee_paid_date' => 'nullable|date',
            'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'income_category_id' => 'nullable|uuid|exists:income_categories,id',
            'is_printed' => 'nullable|boolean',
            'printed_at' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Prevent organization_id changes
        if ($request->has('organization_id')) {
            return response()->json(['error' => 'Cannot change organization_id'], 403);
        }

        // Check if fee payment status is changing
        $wasFeePaid = $card->card_fee_paid;
        $isFeePaid = $validated['card_fee_paid'] ?? $wasFeePaid;
        $feeChanged = $wasFeePaid !== $isFeePaid;

        $card->update($validated);

        // Create or update income entry if fee is paid
        if ($isFeePaid && $card->card_fee > 0) {
            $accountId = $validated['account_id'] ?? null;
            $incomeCategoryId = $validated['income_category_id'] ?? null;

            if ($accountId && $incomeCategoryId) {
                // If income entry exists and fee was already paid, we might need to update it
                // For now, only create if it doesn't exist
                if (!$card->income_entry_id) {
                    $this->createIncomeEntryForCard($card, $accountId, $incomeCategoryId, $user->id);
                }
            } elseif ($feeChanged && $isFeePaid) {
                // Fee just got marked as paid but no account/category provided
                Log::warning("ID card {$card->id} marked as paid but no account_id or income_category_id provided");
            }
        }

        // Refresh card to get updated income_entry_id if created
        $card->refresh();
        
        $card->load([
            'student',
            'studentAdmission',
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'incomeEntry',
        ]);
        
        // Note: printedBy relationship is not loaded to avoid UUID type mismatch errors

        return response()->json($card);
    }

    /**
     * Mark card as printed
     */
    public function markPrinted(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $card = StudentIdCard::whereNull('deleted_at')->find($id);

        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        // Check organization access
        if ($card->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update ID card from different organization'], 403);
        }

        $card->update([
            'is_printed' => true,
            'printed_at' => now(),
            'printed_by' => $user->id,
        ]);

        return response()->json($card);
    }

    /**
     * Mark card fee as paid
     */
    public function markFeePaid(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $card = StudentIdCard::whereNull('deleted_at')->find($id);

        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        // Check organization access
        if ($card->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update ID card from different organization'], 403);
        }

        $validated = $request->validate([
            'card_fee_paid_date' => 'nullable|date',
            'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'income_category_id' => 'nullable|uuid|exists:income_categories,id',
        ]);

        $card->update([
            'card_fee_paid' => true,
            'card_fee_paid_date' => $validated['card_fee_paid_date'] ?? now(),
        ]);

        // Create income entry if fee is paid and account/category provided
        if ($card->card_fee > 0) {
            $accountId = $validated['account_id'] ?? null;
            $incomeCategoryId = $validated['income_category_id'] ?? null;

            if ($accountId && $incomeCategoryId) {
                $this->createIncomeEntryForCard($card, $accountId, $incomeCategoryId, $user->id);
                // Refresh card to get updated income_entry_id
                $card->refresh();
            } else {
                Log::warning("ID card {$card->id} marked as paid but no account_id or income_category_id provided");
            }
        }

        // Load relationships including income entry
        $card->load([
            'student',
            'studentAdmission',
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'incomeEntry',
        ]);

        return response()->json($card);
    }

    /**
     * Remove the specified ID card (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $card = StudentIdCard::whereNull('deleted_at')->find($id);

        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        // Check organization access
        if ($card->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot delete ID card from different organization'], 403);
        }

        // Soft delete
        $card->delete();

        return response()->noContent();
    }

    /**
     * Preview card image
     */
    public function preview(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $id = $request->input('id');
        if (!$id) {
            return response()->json(['error' => 'Card ID is required'], 400);
        }

        $card = StudentIdCard::with(['student', 'template', 'academicYear', 'class'])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        // Check organization access
        if ($card->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        $side = $request->input('side', 'front');

        try {
            $imagePath = $this->exportService->generateCardImage($card, $side);
            
            if (!$imagePath || !Storage::exists($imagePath)) {
                return response()->json(['error' => 'Failed to generate card preview'], 500);
            }

            return Storage::download($imagePath);
        } catch (\Exception $e) {
            Log::error("Failed to generate card preview: " . $e->getMessage());
            return response()->json(['error' => 'Failed to generate card preview'], 500);
        }
    }

    /**
     * Bulk export cards (ZIP/PDF)
     */
    public function exportBulk(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // CRITICAL: Ensure organization context is set for Spatie permissions
        // This should already be set by middleware, but ensure it's set here too
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        // Check permission with better error handling
        try {
            // Check if user has the permission
            if (!$user->hasPermissionTo('id_cards.export')) {
                // Get user's roles and permissions for better error message
                $userRoles = [];
                $userPermissions = [];
                try {
                    $userRoles = $user->getRoleNames()->toArray();
                    $allPermissions = $user->getAllPermissions();
                    $userPermissions = $allPermissions->pluck('name')->toArray();
                } catch (\Exception $e) {
                    // Ignore errors when getting roles/permissions
                }
                
                Log::warning('User does not have id_cards.export permission', [
                    'user_id' => $user->id,
                    'user_email' => $user->email ?? null,
                    'organization_id' => $profile->organization_id,
                    'roles' => $userRoles,
                    'user_permissions_count' => count($userPermissions),
                    'team_id' => function_exists('getPermissionsTeamId') ? getPermissionsTeamId() : null,
                ]);

                $errorMessage = 'You do not have permission to export ID cards.';
                if (!empty($userRoles)) {
                    $errorMessage .= ' Your role(s): ' . implode(', ', $userRoles) . '.';
                }
                $errorMessage .= ' Please contact your administrator to grant you the id_cards.export permission.';

                return response()->json([
                    'error' => 'This action is unauthorized',
                    'message' => $errorMessage,
                    'permission' => 'id_cards.export',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for id_cards.export", [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Permission check failed',
                'message' => 'An error occurred while checking permissions. Please try again or contact support.',
            ], 500);
        }

        $validated = $request->validate([
            'card_ids' => 'nullable|array',
            'card_ids.*' => 'required_with:card_ids|uuid|exists:student_id_cards,id',
            'filters' => 'nullable|array',
            'filters.academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'filters.class_id' => 'nullable|uuid|exists:classes,id',
            'filters.class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'filters.school_id' => 'nullable|uuid|exists:schools,id',
            'filters.enrollment_status' => 'nullable|string|in:active,inactive,graduated,transferred',
            'filters.template_id' => 'nullable|uuid|exists:id_card_templates,id',
            'filters.id_card_template_id' => 'nullable|uuid|exists:id_card_templates,id',
            'filters.is_printed' => 'nullable|boolean',
            'filters.card_fee_paid' => 'nullable|boolean',
            'filters.search' => 'nullable|string|max:255',
            'format' => 'required|in:zip,pdf',
            'sides' => 'nullable|array',
            'sides.*' => 'in:front,back',
            'cards_per_page' => 'nullable|integer|min:1|max:9',
            'quality' => 'nullable|in:standard,high',
            'include_unprinted' => 'nullable|boolean',
            'include_unpaid' => 'nullable|boolean',
        ]);

        // Get card IDs - either from request or by querying with filters
        $cardIds = [];

        if (!empty($validated['card_ids']) && is_array($validated['card_ids']) && count($validated['card_ids']) > 0) {
            // Use provided card IDs
            $cardIds = $validated['card_ids'];
        } elseif (!empty($validated['filters'])) {
            // Query cards based on filters (same logic as index method)
            try {
                $currentSchoolId = $this->getCurrentSchoolId($request);
                $schoolIds = [$currentSchoolId];

                $query = StudentIdCard::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->forAccessibleSchools($schoolIds);
            } catch (\Exception $e) {
                Log::error('Error building export query', [
                    'user_id' => $user->id,
                    'organization_id' => $profile->organization_id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'Failed to build export query',
                    'message' => 'An error occurred while preparing the export. Please try again.',
                ], 500);
            }

            $filters = $validated['filters'];

            // Filter by academic year
            if (!empty($filters['academic_year_id'])) {
                $query->where('academic_year_id', $filters['academic_year_id']);
            }

            // Filter by class
            if (!empty($filters['class_id'])) {
                $query->where('class_id', $filters['class_id']);
            }

            // Filter by class academic year
            if (!empty($filters['class_academic_year_id'])) {
                $query->where('class_academic_year_id', $filters['class_academic_year_id']);
            }

            // Filter by school_id if provided
            if (!empty($filters['school_id'])) {
                // Verify the school_id is in accessible schools
                if (!in_array($filters['school_id'], $schoolIds, true)) {
                    return response()->json(['error' => 'School not accessible'], 403);
                }
                $query->where('school_id', $filters['school_id']);
            }

            // Filter by template (support both template_id and id_card_template_id)
            $templateId = $filters['id_card_template_id'] ?? $filters['template_id'] ?? null;
            if (!empty($templateId)) {
                $query->where('id_card_template_id', $templateId);
            }

            // Filter by printed status
            if (isset($filters['is_printed'])) {
                $query->where('is_printed', filter_var($filters['is_printed'], FILTER_VALIDATE_BOOLEAN));
            }

            // Filter by fee paid status
            if (isset($filters['card_fee_paid'])) {
                $query->where('card_fee_paid', filter_var($filters['card_fee_paid'], FILTER_VALIDATE_BOOLEAN));
            }

            // Filter by enrollment status (via student_admissions)
            if (!empty($filters['enrollment_status'])) {
                $query->whereHas('studentAdmission', function ($q) use ($filters) {
                    $q->where('enrollment_status', $filters['enrollment_status']);
                });
            }

            // Search by student name or admission number
            if (!empty($filters['search'])) {
                $search = $filters['search'];
                $query->whereHas('student', function ($q) use ($search) {
                    $q->where('full_name', 'ilike', "%{$search}%")
                      ->orWhere('admission_no', 'ilike', "%{$search}%");
                });
            }

            // Apply include_unprinted filter (if false, only include printed cards)
            if (isset($validated['include_unprinted']) && !$validated['include_unprinted']) {
                $query->where('is_printed', true);
            }

            // Apply include_unpaid filter (if false, only include paid cards)
            if (isset($validated['include_unpaid']) && !$validated['include_unpaid']) {
                $query->where('card_fee_paid', true);
            }

            // Get card IDs from query
            try {
                $cardIds = $query->pluck('id')->toArray();
                
                Log::info('Export query executed', [
                    'user_id' => $user->id,
                    'organization_id' => $profile->organization_id,
                    'card_count' => count($cardIds),
                    'filters' => $filters,
                ]);

                if (empty($cardIds)) {
                    return response()->json(['error' => 'No cards found matching the filters'], 404);
                }
            } catch (\Exception $e) {
                Log::error('Error executing export query', [
                    'user_id' => $user->id,
                    'organization_id' => $profile->organization_id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'Failed to query cards',
                    'message' => 'An error occurred while querying cards for export. Please try again.',
                ], 500);
            }
        } else {
            return response()->json(['error' => 'Either card_ids or filters must be provided'], 400);
        }

        // Verify all cards belong to user's organization
        $cards = StudentIdCard::whereIn('id', $cardIds)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        if ($cards->count() !== count($cardIds)) {
            return response()->json(['error' => 'Some cards not found or belong to different organization'], 404);
        }

        try {
            $format = $validated['format'];
            $sides = $validated['sides'] ?? ['front'];
            $cardsPerPage = $validated['cards_per_page'] ?? 6;
            $quality = $validated['quality'] ?? 'standard';

            Log::info('Starting bulk export', [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
                'format' => $format,
                'card_count' => count($cardIds),
                'sides' => $sides,
            ]);

            if ($format === 'zip') {
                $filePath = $this->exportService->exportBulkZip(
                    $cardIds,
                    $sides,
                    $quality
                );
            } else {
                $filePath = $this->exportService->exportBulkPdf(
                    $cardIds,
                    $sides,
                    $cardsPerPage,
                    $quality
                );
            }

            // Check if file exists using direct file system check
            // Note: We use file_exists() because we're using direct file operations,
            // not Storage facade (which uses storage/app/private as root)
            $fullFilePath = storage_path('app/' . $filePath);
            
            if (!$filePath || !file_exists($fullFilePath)) {
                Log::error('Export file not found after generation', [
                    'file_path' => $filePath,
                    'full_path' => $fullFilePath,
                    'exists' => $filePath ? file_exists($fullFilePath) : false,
                ]);
                return response()->json(['error' => 'Failed to generate export'], 500);
            }

            Log::info('Export completed successfully', [
                'file_path' => $filePath,
                'full_path' => $fullFilePath,
                'file_size' => filesize($fullFilePath),
                'format' => $format,
            ]);

            // Use response()->download() with the full file path
            // Since we created the file directly in storage/app/, not storage/app/private
            $fileName = basename($filePath);
            return response()->download($fullFilePath, $fileName, [
                'Content-Type' => $format === 'zip' ? 'application/zip' : 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ]);
        } catch (\Exception $e) {
            Log::error("Bulk export failed", [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'card_count' => count($cardIds),
                'format' => $validated['format'] ?? 'unknown',
            ]);
            return response()->json([
                'error' => 'Export failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export individual card
     */
    public function exportIndividual(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.export')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.export: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $card = StudentIdCard::whereNull('deleted_at')->find($id);

        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        // Check organization access
        if ($card->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

        $validated = $request->validate([
            'format' => 'nullable|in:png,pdf|default:png',
            'side' => 'nullable|in:front,back|default:front',
        ]);

        // Load required relationships
        $card->load(['student', 'template', 'academicYear', 'class']);

        // Validate required relationships
        if (!$card->student) {
            Log::error("ID card export failed: Student not found", [
                'card_id' => $card->id,
                'student_id' => $card->student_id,
            ]);
            return response()->json(['error' => 'Student not found for this ID card'], 404);
        }

        if (!$card->template) {
            Log::error("ID card export failed: Template not found", [
                'card_id' => $card->id,
                'template_id' => $card->template_id,
            ]);
            return response()->json(['error' => 'ID card template not found'], 404);
        }

        try {
            $filePath = $this->exportService->exportIndividual(
                $card,
                $validated['format'] ?? 'png',
                $validated['side'] ?? 'front'
            );

            if (!$filePath) {
                Log::error("ID card export failed: exportService returned null", [
                    'card_id' => $card->id,
                    'format' => $validated['format'] ?? 'png',
                    'side' => $validated['side'] ?? 'front',
                ]);
                return response()->json(['error' => 'Failed to generate export - service returned null'], 500);
            }

            if (!Storage::exists($filePath)) {
                Log::error("ID card export failed: Generated file not found", [
                    'card_id' => $card->id,
                    'file_path' => $filePath,
                    'format' => $validated['format'] ?? 'png',
                ]);
                return response()->json(['error' => 'Failed to generate export - file not found'], 500);
            }

            return Storage::download($filePath);
        } catch (\Exception $e) {
            Log::error("Individual export failed: " . $e->getMessage(), [
                'card_id' => $card->id,
                'format' => $validated['format'] ?? 'png',
                'side' => $validated['side'] ?? 'front',
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Export failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create income entry for ID card fee payment
     * 
     * @param StudentIdCard $card
     * @param string $accountId
     * @param string $incomeCategoryId
     * @param string|null $userId
     * @return IncomeEntry|null
     */
    protected function createIncomeEntryForCard(StudentIdCard $card, string $accountId, string $incomeCategoryId, ?string $userId = null): ?IncomeEntry
    {
        // Only create income entry if fee is paid and amount > 0
        if (!$card->card_fee_paid || $card->card_fee <= 0) {
            return null;
        }

        // If income entry already exists, don't create another
        if ($card->income_entry_id) {
            return $card->incomeEntry;
        }

        // Get base currency for organization
        $baseCurrency = Currency::where('organization_id', $card->organization_id)
            ->where('is_base', true)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();

        if (!$baseCurrency) {
            Log::warning("No base currency found for organization {$card->organization_id}");
            return null;
        }

        // Verify account belongs to organization
        $account = FinanceAccount::where('id', $accountId)
            ->where('organization_id', $card->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$account) {
            Log::warning("Account {$accountId} not found or doesn't belong to organization {$card->organization_id}");
            return null;
        }

        // Verify income category belongs to organization
        $incomeCategory = IncomeCategory::where('id', $incomeCategoryId)
            ->where('organization_id', $card->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$incomeCategory) {
            Log::warning("Income category {$incomeCategoryId} not found or doesn't belong to organization {$card->organization_id}");
            return null;
        }

        // Get student name for description
        $studentName = $card->student ? $card->student->full_name : 'Unknown Student';

        // Create income entry
        $incomeEntry = IncomeEntry::create([
            'organization_id' => $card->organization_id,
            'school_id' => $card->school_id,
            'currency_id' => $baseCurrency->id,
            'account_id' => $accountId,
            'income_category_id' => $incomeCategoryId,
            'project_id' => null,
            'donor_id' => null,
            'amount' => $card->card_fee,
            'date' => $card->card_fee_paid_date ?? now(),
            'reference_no' => "IDCARD-{$card->id}",
            'description' => "ID Card Fee for {$studentName}",
            'received_by_user_id' => $userId,
            'payment_method' => 'cash', // Default to cash, can be updated later if needed
        ]);

        // Link income entry to card
        $card->income_entry_id = $incomeEntry->id;
        $card->save();

        return $incomeEntry;
    }

}

