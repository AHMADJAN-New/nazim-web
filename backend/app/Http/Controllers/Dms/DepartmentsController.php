<?php

namespace App\Http\Controllers\Dms;

use App\Models\Department;
use App\Models\IncomingDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DepartmentsController extends BaseDmsController
{
    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        return Department::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->orderBy('name')
            ->get();
    }

    public function show(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $department = Department::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        return $department;
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $data['organization_id'] = $profile->organization_id;
        $data['school_id'] = $currentSchoolId;

        $department = Department::create($data);

        return response()->json($department, 201);
    }

    public function update(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $department = Department::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $department->update($data);

        return $department;
    }

    public function destroy(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $department = Department::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        // Check if department is in use
        $inUse = IncomingDocument::where('routing_department_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json(['error' => 'This department is in use and cannot be deleted'], 409);
        }

        $department->delete();

        return response()->noContent();
    }

    public function stats(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $stats = DB::table('departments')
            ->leftJoin('incoming_documents', 'departments.id', '=', 'incoming_documents.routing_department_id')
            ->where('departments.organization_id', $profile->organization_id)
            ->where('departments.school_id', $currentSchoolId)
            ->select(
                'departments.id',
                'departments.name',
                DB::raw('COUNT(incoming_documents.id) as incoming_count')
            )
            ->groupBy('departments.id', 'departments.name')
            ->get();

        return $stats;
    }
}
