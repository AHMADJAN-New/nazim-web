<?php

namespace App\Http\Controllers;

use App\Models\StudentIdCard;
use App\Models\StudentAdmission;
use App\Models\CourseStudent;
use App\Models\IdCardTemplate;
use App\Models\IncomeEntry;
use App\Models\Currency;
use App\Models\FinanceAccount;
use App\Models\IncomeCategory;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentIdCardController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
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

        // Filter by student type (regular, course, or all)
        if ($request->has('student_type') && $request->student_type) {
            if ($request->student_type === 'regular') {
                $query->forRegularStudents();
            } elseif ($request->student_type === 'course') {
                $query->forCourseStudents();
            }
            // 'all' means no filter
        }

        // Filter by course_id (for course students)
        if ($request->has('course_id') && $request->course_id) {
            $query->whereHas('courseStudent', function ($q) use ($request) {
                $q->where('course_id', $request->course_id);
            });
        }

        // Filter by course_student_id
        if ($request->has('course_student_id') && $request->course_student_id) {
            $query->forCourseStudent($request->course_student_id);
        }

        // Filter by enrollment status (via student_admissions for regular students)
        if ($request->has('enrollment_status') && $request->enrollment_status) {
            $query->whereHas('studentAdmission', function ($q) use ($request) {
                $q->where('enrollment_status', $request->enrollment_status);
            });
        }

        // Search by student name or admission number (handles both regular and course students)
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                // Search in regular students
                $q->whereHas('student', function ($subQ) use ($search) {
                    $subQ->where('full_name', 'ilike', "%{$search}%")
                         ->orWhere('admission_no', 'ilike', "%{$search}%");
                })
                // Or search in course students
                ->orWhereHas('courseStudent', function ($subQ) use ($search) {
                    $subQ->where('full_name', 'ilike', "%{$search}%")
                         ->orWhere('admission_no', 'ilike', "%{$search}%");
                });
            });
        }

        // Eager load relationships
        // Note: printedBy is NOT loaded to avoid UUID type mismatch errors
        $query->with([
            'student',
            'studentAdmission',
            'courseStudent.course', // Load course relationship for course students
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'organization',
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

        // Validate that either student_admission_ids OR course_student_ids is provided, but not both
        $hasStudentAdmissionIds = $request->has('student_admission_ids') && !empty($request->student_admission_ids);
        $hasCourseStudentIds = $request->has('course_student_ids') && !empty($request->course_student_ids);

        if (!$hasStudentAdmissionIds && !$hasCourseStudentIds) {
            return response()->json(['error' => 'Either student_admission_ids or course_student_ids must be provided'], 400);
        }

        if ($hasStudentAdmissionIds && $hasCourseStudentIds) {
            return response()->json(['error' => 'Cannot provide both student_admission_ids and course_student_ids'], 400);
        }

        $validated = $request->validate([
            'academic_year_id' => 'required|uuid|exists:academic_years,id',
            'id_card_template_id' => 'required|uuid|exists:id_card_templates,id',
            'student_admission_ids' => $hasStudentAdmissionIds ? 'required|array|min:1' : 'nullable|array',
            'student_admission_ids.*' => $hasStudentAdmissionIds ? 'required|uuid|exists:student_admissions,id' : 'nullable',
            'course_student_ids' => $hasCourseStudentIds ? 'required|array|min:1' : 'nullable|array',
            'course_student_ids.*' => $hasCourseStudentIds ? 'required|uuid|exists:course_students,id' : 'nullable',
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
            // Handle regular students (student_admission_ids)
            if ($hasStudentAdmissionIds) {
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
                        ->whereNull('course_student_id') // Ensure it's a regular student card
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
                            'course_student_id' => null, // Regular student
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
            }

            // Handle course students (course_student_ids)
            if ($hasCourseStudentIds) {
                foreach ($validated['course_student_ids'] as $courseStudentId) {
                    // Get course student
                    $courseStudent = CourseStudent::where('id', $courseStudentId)
                        ->where('organization_id', $profile->organization_id)
                        ->whereNull('deleted_at')
                        ->first();

                    if (!$courseStudent) {
                        $skipped[] = [
                            'course_student_id' => $courseStudentId,
                            'reason' => 'course_student_not_found'
                        ];
                        continue;
                    }

                    // Check if card already exists for this course student and academic year
                    $existing = StudentIdCard::where('course_student_id', $courseStudentId)
                        ->where('academic_year_id', $validated['academic_year_id'])
                        ->whereNull('deleted_at')
                        ->first();

                    if ($existing) {
                        $skipped[] = [
                            'course_student_id' => $courseStudentId,
                            'reason' => 'already_assigned',
                            'card_id' => $existing->id
                        ];
                        continue;
                    }

                    try {
                        // Get course to determine school_id
                        $course = $courseStudent->course;
                        $schoolId = $course && $course->school_id ? $course->school_id : null;

                        $card = StudentIdCard::create([
                            'organization_id' => $profile->organization_id,
                            'school_id' => $schoolId, // Set school_id from course
                            'student_id' => $courseStudent->main_student_id, // Link to main student if available
                            'student_admission_id' => null, // Course students don't have admissions
                            'course_student_id' => $courseStudentId,
                            'id_card_template_id' => $validated['id_card_template_id'],
                            'academic_year_id' => $validated['academic_year_id'],
                            'class_id' => null, // Course students don't have classes
                            'class_academic_year_id' => null, // Course students don't have classes
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
                            'course_student_id' => $courseStudentId,
                            'error' => $e->getMessage()
                        ];
                    }
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
            'courseStudent.course', // Load course relationship for course students
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'organization',
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

        // Capture old values before update
        $oldValues = $card->only(['card_number', 'card_fee', 'card_fee_paid', 'card_fee_paid_date', 'is_printed', 'printed_at', 'notes']);

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
            'organization',
            'incomeEntry',
        ]);
        
        // Note: printedBy relationship is not loaded to avoid UUID type mismatch errors

        // Log ID card update
        try {
            $studentName = $card->student?->full_name ?? ($card->courseStudent?->full_name ?? 'Unknown');
            $this->activityLogService->logUpdate(
                subject: $card,
                description: "Updated ID card for {$studentName}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $card->only(['card_number', 'card_fee', 'card_fee_paid', 'card_fee_paid_date', 'is_printed', 'printed_at', 'notes']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log ID card update: ' . $e->getMessage());
        }

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

        // Log ID card printed
        try {
            $studentName = $card->student?->full_name ?? ($card->courseStudent?->full_name ?? 'Unknown');
            $this->activityLogService->logEvent(
                subject: $card,
                description: "Marked ID card as printed for {$studentName}",
                properties: [
                    'card_id' => $card->id,
                    'card_number' => $card->card_number,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log ID card printed: ' . $e->getMessage());
        }

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
            'organization',
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

        // Capture data before deletion
        $cardData = $card->toArray();
        $studentName = $card->student?->full_name ?? ($card->courseStudent?->full_name ?? 'Unknown');

        // Soft delete
        $card->delete();

        // Log ID card deletion
        try {
            $this->activityLogService->logDelete(
                subject: $card,
                description: "Deleted ID card for {$studentName}",
                properties: ['deleted_card' => $cardData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log ID card deletion: ' . $e->getMessage());
        }

        return response()->noContent();
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

        // Get student name for description (handle both regular and course students)
        $studentName = 'Unknown Student';
        if ($card->student) {
            $studentName = $card->student->full_name;
        } elseif ($card->courseStudent) {
            $studentName = $card->courseStudent->full_name;
        }

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

