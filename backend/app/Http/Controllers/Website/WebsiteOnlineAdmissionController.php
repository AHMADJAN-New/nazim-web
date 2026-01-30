<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\OnlineAdmission;
use App\Models\OnlineAdmissionDocument;
use App\Models\OnlineAdmissionFieldValue;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\StudentDocument;
use App\Models\StudentEducationalHistory;
use App\Services\CodeGenerator;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebsiteOnlineAdmissionController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $query = OnlineAdmission::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                    ->orWhere('father_name', 'ilike', "%{$search}%")
                    ->orWhere('guardian_phone', 'ilike', "%{$search}%")
                    ->orWhere('application_no', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25;
            }

            $admissions = $query->orderBy('submitted_at', 'desc')->paginate((int)$perPage);
            $admissions->getCollection()->transform(function ($admission) {
                return $this->transformAdmissionSummary($admission);
            });

            return response()->json($admissions);
        }

        $admissions = $query->orderBy('submitted_at', 'desc')->get();
        $admissions->transform(function ($admission) {
            return $this->transformAdmissionSummary($admission);
        });

        return response()->json($admissions);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $admission = OnlineAdmission::with(['documents', 'fieldValues.field'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Admission not found'], 404);
        }

        $admission = $this->transformAdmissionDetail($admission);

        return response()->json($admission);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $admission = OnlineAdmission::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Admission not found'], 404);
        }

        $data = $request->validate([
            'status' => 'nullable|in:submitted,under_review,accepted,rejected,archived',
            'notes' => 'nullable|string|max:2000',
            'rejection_reason' => 'nullable|string|max:2000',
        ]);

        if (($data['status'] ?? null) === 'accepted' && !$admission->student_id) {
            return response()->json([
                'error' => 'Use the accept action to create a student before marking as accepted.',
            ], 422);
        }

        $statusChanged = isset($data['status']) && $data['status'] !== $admission->status;

        $admission->fill($data);

        if ($statusChanged) {
            $admission->reviewed_by = $user->id;
            $admission->reviewed_at = now();
        }

        if ($statusChanged && $data['status'] === 'accepted') {
            $admission->accepted_at = now();
        }

        if ($statusChanged && $data['status'] === 'rejected') {
            $admission->rejected_at = now();
        }

        $admission->save();

        return response()->json($this->transformAdmissionSummary($admission));
    }

    public function accept(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $admission = OnlineAdmission::with(['documents', 'fieldValues'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Admission not found'], 404);
        }

        if ($admission->status === 'accepted' && $admission->student_id) {
            return response()->json([
                'error' => 'Admission already accepted',
                'student_id' => $admission->student_id,
            ], 409);
        }

        $data = $request->validate([
            'admission_no' => 'nullable|string|max:100',
            'admission_year' => 'nullable|string|max:10',
        ]);

        try {
            DB::beginTransaction();

            $studentData = $admission->only([
                'full_name',
                'father_name',
                'grandfather_name',
                'mother_name',
                'gender',
                'birth_year',
                'birth_date',
                'age',
                'admission_year',
                'orig_province',
                'orig_district',
                'orig_village',
                'curr_province',
                'curr_district',
                'curr_village',
                'nationality',
                'preferred_language',
                'previous_school',
                'guardian_name',
                'guardian_relation',
                'guardian_phone',
                'guardian_tazkira',
                'home_address',
                'zamin_name',
                'zamin_phone',
                'zamin_tazkira',
                'zamin_address',
                'applying_grade',
                'is_orphan',
                'disability_status',
                'emergency_contact_name',
                'emergency_contact_phone',
                'family_income',
            ]);

            $studentData['organization_id'] = $profile->organization_id;
            $studentData['school_id'] = $schoolId;
            $studentData['admission_no'] = $data['admission_no'] ?? CodeGenerator::generateAdmissionNumber($profile->organization_id);
            $studentData['admission_year'] = $data['admission_year'] ?? $admission->admission_year;
            $studentData['student_status'] = 'admitted';
            $studentData['admission_fee_status'] = 'pending';

            $student = Student::create($studentData);

            if ($admission->picture_path) {
                $student->picture_path = $this->fileStorageService->copyAdmissionFileToStudentPicture(
                    $admission->picture_path,
                    $profile->organization_id,
                    $student->id,
                    $schoolId
                );
            }

            if ($admission->guardian_picture_path) {
                $student->guardian_picture_path = $this->fileStorageService->copyAdmissionFileToGuardianPicture(
                    $admission->guardian_picture_path,
                    $profile->organization_id,
                    $student->id,
                    $schoolId
                );
            }

            $student->save();

            StudentAdmission::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $schoolId,
                'student_id' => $student->id,
                'admission_year' => $studentData['admission_year'],
                'admission_date' => $admission->submitted_at ?? now(),
                'enrollment_status' => 'admitted',
            ]);

            if (!empty($admission->previous_school)) {
                StudentEducationalHistory::create([
                    'student_id' => $student->id,
                    'organization_id' => $profile->organization_id,
                    'school_id' => $schoolId,
                    'institution_name' => $admission->previous_school,
                    'academic_year' => $admission->previous_academic_year,
                    'grade_level' => $admission->previous_grade_level,
                    'notes' => $admission->previous_school_notes,
                    'created_by' => $user->id,
                ]);
            }

            foreach ($admission->documents as $doc) {
                $newPath = $this->fileStorageService->copyAdmissionFileToStudentDocument(
                    $doc->file_path,
                    $profile->organization_id,
                    $student->id,
                    $schoolId,
                    $doc->document_type
                );

                StudentDocument::create([
                    'student_id' => $student->id,
                    'organization_id' => $profile->organization_id,
                    'school_id' => $schoolId,
                    'document_type' => $doc->document_type,
                    'file_name' => $doc->file_name,
                    'file_path' => $newPath,
                    'file_size' => $doc->file_size,
                    'mime_type' => $doc->mime_type,
                    'description' => $doc->description,
                    'uploaded_by' => $user->id,
                ]);
            }

            $admission->status = 'accepted';
            $admission->reviewed_by = $user->id;
            $admission->reviewed_at = now();
            $admission->accepted_at = now();
            $admission->student_id = $student->id;
            $admission->save();

            DB::commit();

            return response()->json([
                'admission_id' => $admission->id,
                'student_id' => $student->id,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[WebsiteOnlineAdmissionController] Failed to accept admission', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to accept admission',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function transformAdmissionSummary(OnlineAdmission $admission): OnlineAdmission
    {
        $admission->picture_url = $admission->picture_path
            ? $this->fileStorageService->getPrivateDownloadUrl($admission->picture_path)
            : null;
        $admission->guardian_picture_url = $admission->guardian_picture_path
            ? $this->fileStorageService->getPrivateDownloadUrl($admission->guardian_picture_path)
            : null;

        return $admission;
    }

    private function transformAdmissionDetail(OnlineAdmission $admission): OnlineAdmission
    {
        $admission = $this->transformAdmissionSummary($admission);

        $admission->documents->transform(function (OnlineAdmissionDocument $doc) {
            $doc->file_url = $doc->file_path
                ? $this->fileStorageService->getPrivateDownloadUrl($doc->file_path)
                : null;
            return $doc;
        });

        $admission->fieldValues->transform(function (OnlineAdmissionFieldValue $value) {
            $value->file_url = $value->file_path
                ? $this->fileStorageService->getPrivateDownloadUrl($value->file_path)
                : null;
            return $value;
        });

        return $admission;
    }
}
