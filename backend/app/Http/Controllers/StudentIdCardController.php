<?php

namespace App\Http\Controllers;

use App\Models\StudentIdCard;
use App\Models\StudentAdmission;
use App\Models\IdCardTemplate;
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

        $query = StudentIdCard::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id);

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
        $query->with([
            'student',
            'studentAdmission',
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'printedBy'
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
            'printedBy'
        ])
        ->whereNull('deleted_at')
        ->find($id);

        if (!$card) {
            return response()->json(['error' => 'ID card not found'], 404);
        }

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
            'is_printed' => 'nullable|boolean',
            'printed_at' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Prevent organization_id changes
        if ($request->has('organization_id')) {
            return response()->json(['error' => 'Cannot change organization_id'], 403);
        }

        $card->update($validated);

        $card->load([
            'student',
            'studentAdmission',
            'template',
            'academicYear',
            'class',
            'classAcademicYear',
            'printedBy'
        ]);

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
        ]);

        $card->update([
            'card_fee_paid' => true,
            'card_fee_paid_date' => $validated['card_fee_paid_date'] ?? now(),
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

        // Check permission
        try {
            if (!$user->hasPermissionTo('id_cards.export')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for id_cards.export: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'card_ids' => 'required|array|min:1',
            'card_ids.*' => 'required|uuid|exists:student_id_cards,id',
            'format' => 'required|in:zip,pdf',
            'sides' => 'nullable|array',
            'sides.*' => 'in:front,back',
            'cards_per_page' => 'nullable|integer|min:1|max:9',
            'quality' => 'nullable|in:standard,high',
        ]);

        // Verify all cards belong to user's organization
        $cards = StudentIdCard::whereIn('id', $validated['card_ids'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->get();

        if ($cards->count() !== count($validated['card_ids'])) {
            return response()->json(['error' => 'Some cards not found or belong to different organization'], 404);
        }

        try {
            $format = $validated['format'];
            $sides = $validated['sides'] ?? ['front'];
            $cardsPerPage = $validated['cards_per_page'] ?? 6;
            $quality = $validated['quality'] ?? 'standard';

            if ($format === 'zip') {
                $filePath = $this->exportService->exportBulkZip(
                    $validated['card_ids'],
                    $sides,
                    $quality
                );
            } else {
                $filePath = $this->exportService->exportBulkPdf(
                    $validated['card_ids'],
                    $sides,
                    $cardsPerPage,
                    $quality
                );
            }

            if (!$filePath || !Storage::exists($filePath)) {
                return response()->json(['error' => 'Failed to generate export'], 500);
            }

            return Storage::download($filePath);
        } catch (\Exception $e) {
            Log::error("Bulk export failed: " . $e->getMessage());
            return response()->json(['error' => 'Export failed', 'message' => $e->getMessage()], 500);
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

        try {
            $filePath = $this->exportService->exportIndividual(
                $card,
                $validated['format'] ?? 'png',
                $validated['side'] ?? 'front'
            );

            if (!$filePath || !Storage::exists($filePath)) {
                return response()->json(['error' => 'Failed to generate export'], 500);
            }

            return Storage::download($filePath);
        } catch (\Exception $e) {
            Log::error("Individual export failed: " . $e->getMessage());
            return response()->json(['error' => 'Export failed', 'message' => $e->getMessage()], 500);
        }
    }
}

