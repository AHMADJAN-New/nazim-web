<?php

namespace App\Http\Controllers\Dms;

use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentsController extends BaseDmsController
{
    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        return Department::where('organization_id', $profile->organization_id)
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.settings.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        $data['organization_id'] = $profile->organization_id;

        $department = Department::create($data);

        return response()->json($department, 201);
    }
}
