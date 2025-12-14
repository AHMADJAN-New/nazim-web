<?php

namespace App\Http\Controllers\Dms;

use App\Models\Letterhead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LetterheadsController extends BaseDmsController
{
    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', Letterhead::class);
        [, $profile] = $context;

        return Letterhead::where('organization_id', $profile->organization_id)
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('create', Letterhead::class);
        [, $profile] = $context;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file'],
            'default_for_layout' => ['nullable', 'string'],
            'active' => ['boolean'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        $path = $request->file('file')->store('letterheads');

        $record = Letterhead::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $data['school_id'] ?? null,
            'name' => $data['name'],
            'file_path' => $path,
            'default_for_layout' => $data['default_for_layout'] ?? null,
            'active' => $data['active'] ?? true,
        ]);

        return response()->json($record, 201);
    }

    public function update(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('update', $record);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'default_for_layout' => ['nullable', 'string'],
            'active' => ['boolean'],
            'file' => ['sometimes', 'file'],
        ]);

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('letterheads');
        }

        $record->fill($data);
        $record->save();

        return $record;
    }

    public function download(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('view', $record);

        return Storage::download($record->file_path, $record->name . '.pdf');
    }
}
