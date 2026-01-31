<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\OnlineAdmission;
use App\Models\OnlineAdmissionDocument;
use App\Models\OnlineAdmissionField;
use App\Models\OnlineAdmissionFieldValue;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PublicOnlineAdmissionController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public function fields(Request $request)
    {
        $organizationId = $request->attributes->get('organization_id');
        $schoolId = $request->attributes->get('school_id');

        if (!$organizationId || !$schoolId) {
            return response()->json(['error' => 'School context not found'], 404);
        }

        $cacheKey = "public-admission-fields:{$organizationId}:{$schoolId}";

        $fields = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($organizationId, $schoolId) {
            return OnlineAdmissionField::where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('is_enabled', true)
                ->orderBy('sort_order')
                ->get();
        });

        return response()->json($fields);
    }

    public function submit(Request $request)
    {
        $organizationId = $request->attributes->get('organization_id');
        $schoolId = $request->attributes->get('school_id');

        if (!$organizationId || !$schoolId) {
            return response()->json(['error' => 'School context not found'], 404);
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:150',
            'father_name' => 'required|string|max:150',
            'grandfather_name' => 'nullable|string|max:150',
            'mother_name' => 'nullable|string|max:150',
            'gender' => 'required|in:male,female',
            'birth_year' => 'nullable|string|max:10',
            'birth_date' => 'nullable|date',
            'age' => 'nullable|integer|min:0|max:150',
            'admission_year' => 'nullable|string|max:10',
            'orig_province' => 'nullable|string|max:100',
            'orig_district' => 'nullable|string|max:100',
            'orig_village' => 'nullable|string|max:150',
            'curr_province' => 'nullable|string|max:100',
            'curr_district' => 'nullable|string|max:100',
            'curr_village' => 'nullable|string|max:150',
            'nationality' => 'nullable|string|max:100',
            'preferred_language' => 'nullable|string|max:100',
            'previous_school' => 'nullable|string|max:150',
            'previous_grade_level' => 'nullable|string|max:50',
            'previous_academic_year' => 'nullable|string|max:20',
            'previous_school_notes' => 'nullable|string|max:500',
            'guardian_name' => 'required|string|max:150',
            'guardian_relation' => 'nullable|string|max:100',
            'guardian_phone' => 'required|string|max:25',
            'guardian_tazkira' => 'nullable|string|max:100',
            'home_address' => 'nullable|string|max:500',
            'zamin_name' => 'nullable|string|max:150',
            'zamin_phone' => 'nullable|string|max:25',
            'zamin_tazkira' => 'nullable|string|max:100',
            'zamin_address' => 'nullable|string|max:500',
            'applying_grade' => 'required|string|max:50',
            'is_orphan' => 'nullable|boolean',
            'disability_status' => 'nullable|string|max:150',
            'emergency_contact_name' => 'nullable|string|max:150',
            'emergency_contact_phone' => 'nullable|string|max:25',
            'family_income' => 'nullable|string|max:100',
            'picture' => 'nullable|image|max:10240',
            'guardian_picture' => 'nullable|image|max:10240',
            'documents' => 'nullable|array',
            'documents.*' => 'file|max:10240',
            'document_types' => 'nullable|array',
            'document_types.*' => 'nullable|string|max:100',
            'extra_fields' => 'nullable',
        ]);

        $extraFields = $this->parseExtraFields($request->input('extra_fields'));
        $extraFiles = $request->file('extra_files', []);

        $fields = OnlineAdmissionField::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->get();
        $fieldMap = $fields->keyBy('id');

        $missingRequired = $this->missingRequiredFields($fields, $extraFields, $extraFiles);
        if (!empty($missingRequired)) {
            return response()->json([
                'error' => 'Missing required fields',
                'missing_fields' => $missingRequired,
            ], 422);
        }

        try {
            DB::beginTransaction();

            $admission = OnlineAdmission::create(array_merge($validated, [
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]));

            if ($request->hasFile('picture')) {
                $path = $this->fileStorageService->storeOnlineAdmissionPhoto(
                    $request->file('picture'),
                    $organizationId,
                    $admission->id,
                    $schoolId,
                    'student'
                );
                $admission->picture_path = $path;
            }

            if ($request->hasFile('guardian_picture')) {
                $path = $this->fileStorageService->storeOnlineAdmissionPhoto(
                    $request->file('guardian_picture'),
                    $organizationId,
                    $admission->id,
                    $schoolId,
                    'guardian'
                );
                $admission->guardian_picture_path = $path;
            }

            $admission->save();

            $documents = $request->file('documents', []);
            $documentTypes = $request->input('document_types', []);

            foreach ($documents as $index => $file) {
                if (!$file) {
                    continue;
                }
                $docType = $documentTypes[$index] ?? 'document';
                $filePath = $this->fileStorageService->storeOnlineAdmissionDocument(
                    $file,
                    $organizationId,
                    $admission->id,
                    $schoolId,
                    $docType
                );

                OnlineAdmissionDocument::create([
                    'online_admission_id' => $admission->id,
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'document_type' => $docType,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $filePath,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                ]);
            }

            foreach ($extraFields as $fieldValue) {
                $fieldId = $fieldValue['field_id'] ?? null;
                if (!$fieldId || !$fieldMap->has($fieldId)) {
                    continue;
                }

                $value = $fieldValue['value'] ?? null;
                if ($value === null || $value === '') {
                    continue;
                }

                OnlineAdmissionFieldValue::create([
                    'online_admission_id' => $admission->id,
                    'field_id' => $fieldId,
                    'value_text' => is_array($value) ? null : $value,
                    'value_json' => is_array($value) ? $value : null,
                ]);
            }

            if (is_array($extraFiles)) {
                foreach ($extraFiles as $fieldId => $file) {
                    if (!$file || !$fieldMap->has($fieldId)) {
                        continue;
                    }

                    $field = $fieldMap->get($fieldId);
                    if (!in_array($field->field_type, ['file', 'photo'], true)) {
                        continue;
                    }

                    $filePath = $this->fileStorageService->storeOnlineAdmissionDocument(
                        $file,
                        $organizationId,
                        $admission->id,
                        $schoolId,
                        "field-{$field->key}"
                    );

                    OnlineAdmissionFieldValue::create([
                        'online_admission_id' => $admission->id,
                        'field_id' => $fieldId,
                        'file_path' => $filePath,
                        'file_name' => $file->getClientOriginalName(),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getClientMimeType(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'id' => $admission->id,
                'application_no' => $admission->application_no,
                'status' => $admission->status,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[PublicOnlineAdmissionController] Failed to submit admission', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to submit admission',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function parseExtraFields($raw): array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }

        return is_array($raw) ? $raw : [];
    }

    private function missingRequiredFields($fields, array $extraFields, $extraFiles): array
    {
        $requiredFields = $fields->filter(fn ($field) => $field->is_required);
        if ($requiredFields->isEmpty()) {
            return [];
        }

        $provided = [];
        foreach ($extraFields as $fieldValue) {
            if (!empty($fieldValue['field_id'])) {
                $provided[$fieldValue['field_id']] = $fieldValue['value'] ?? null;
            }
        }

        $missing = [];
        foreach ($requiredFields as $field) {
            if (in_array($field->field_type, ['file', 'photo'], true)) {
                if (!is_array($extraFiles) || !isset($extraFiles[$field->id])) {
                    $missing[] = $field->label ?? $field->key;
                }
                continue;
            }

            $value = $provided[$field->id] ?? null;
            if ($value === null || $value === '' || (is_array($value) && count($value) === 0)) {
                $missing[] = $field->label ?? $field->key;
            }
        }

        return $missing;
    }
}
