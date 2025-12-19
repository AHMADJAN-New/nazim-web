<?php

namespace App\Http\Controllers;

use App\Models\ExamType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamTypeController extends Controller
{
    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exam_types.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exam_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = ExamType::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $examTypes = $query->orderBy('display_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($examTypes);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exam_types.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exam_types.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:1000',
            'display_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Check for unique code per organization
        if (!empty($validated['code'])) {
            $exists = ExamType::where('organization_id', $profile->organization_id)
                ->where('code', $validated['code'])
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                return response()->json(['error' => 'Exam type code already exists for this organization'], 422);
            }
        }

        $examType = ExamType::create([
            'organization_id' => $profile->organization_id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'display_order' => $validated['display_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($examType, 201);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exam_types.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exam_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examType = ExamType::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$examType) {
            return response()->json(['error' => 'Exam type not found'], 404);
        }

        return response()->json($examType);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exam_types.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exam_types.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examType = ExamType::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$examType) {
            return response()->json(['error' => 'Exam type not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:1000',
            'display_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Check for unique code per organization (excluding current record)
        if (isset($validated['code']) && !empty($validated['code'])) {
            $exists = ExamType::where('organization_id', $profile->organization_id)
                ->where('code', $validated['code'])
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                return response()->json(['error' => 'Exam type code already exists for this organization'], 422);
            }
        }

        $examType->update($validated);

        return response()->json($examType);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exam_types.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exam_types.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examType = ExamType::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$examType) {
            return response()->json(['error' => 'Exam type not found'], 404);
        }

        // Check if exam type is in use
        $inUse = $examType->exams()->whereNull('deleted_at')->exists();

        if ($inUse) {
            return response()->json(['error' => 'This exam type is in use and cannot be deleted'], 409);
        }

        $examType->delete();

        return response()->noContent();
    }
}

