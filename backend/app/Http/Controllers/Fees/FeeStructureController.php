<?php

namespace App\Http\Controllers\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeeStructureStoreRequest;
use App\Http\Requests\Fees\FeeStructureUpdateRequest;
use App\Models\FeeStructure;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FeeStructureController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
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

        try {
            if (!$user->hasPermissionTo('fees.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for fees.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'class_id' => 'nullable|uuid|exists:classes,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'is_active' => 'nullable|boolean',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = FeeStructure::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->with(['academicYear', 'classModel', 'classAcademicYear', 'currency']);

        if (!empty($validated['academic_year_id'])) {
            $query->where('academic_year_id', $validated['academic_year_id']);
        }

        if (!empty($validated['class_id'])) {
            $query->where('class_id', $validated['class_id']);
        }

        if (!empty($validated['class_academic_year_id'])) {
            $query->where('class_academic_year_id', $validated['class_academic_year_id']);
        }

        if (array_key_exists('is_active', $validated)) {
            $query->where('is_active', $validated['is_active']);
        }

        $query->orderBy('display_order')->orderBy('name');

        // Check if pagination is requested
        if (!empty($validated['page']) || !empty($validated['per_page'])) {
            $perPage = $validated['per_page'] ?? 25;
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    public function store(FeeStructureStoreRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('fees.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for fees.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();
        $validated['organization_id'] = $profile->organization_id;
        $validated['school_id'] = $this->getCurrentSchoolId($request);

        $structure = FeeStructure::create($validated);

        // Log fee structure creation
        try {
            $this->activityLogService->logCreate(
                subject: $structure,
                description: "Created fee structure: {$structure->name}",
                properties: [
                    'structure_name' => $structure->name,
                    'amount' => $structure->amount,
                    'currency_id' => $structure->currency_id,
                    'academic_year_id' => $structure->academic_year_id,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log fee structure creation: ' . $e->getMessage());
        }

        return response()->json($structure, 201);
    }

    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('fees.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = request()->get('current_school_id');

        $structure = FeeStructure::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->with(['academicYear', 'classModel', 'classAcademicYear', 'currency'])
            ->find($id);

        if (!$structure) {
            return response()->json(['error' => 'Fee structure not found'], 404);
        }

        return response()->json($structure);
    }

    public function update(FeeStructureUpdateRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('fees.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $structure = FeeStructure::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$structure) {
            return response()->json(['error' => 'Fee structure not found'], 404);
        }

        // Capture old values for logging
        $oldValues = $structure->only(['name', 'amount', 'currency_id', 'academic_year_id', 'class_id', 'is_active']);

        $structure->update($request->validated());

        // Log fee structure update
        try {
            $this->activityLogService->logUpdate(
                subject: $structure,
                description: "Updated fee structure: {$structure->name}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $structure->only(['name', 'amount', 'currency_id', 'academic_year_id', 'class_id', 'is_active']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log fee structure update: ' . $e->getMessage());
        }

        return response()->json($structure->fresh());
    }

    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('fees.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = request()->get('current_school_id');

        $structure = FeeStructure::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$structure) {
            return response()->noContent();
        }

        $structureName = $structure->name;
        $structureData = $structure->toArray();
        $structure->delete();

        // Log fee structure deletion
        try {
            $this->activityLogService->logDelete(
                subject: $structure,
                description: "Deleted fee structure: {$structureName}",
                properties: ['deleted_structure' => $structureData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log fee structure deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }
}

