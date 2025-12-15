<?php

namespace App\Http\Controllers\Dms;

use App\Models\LetterType;
use Illuminate\Http\Request;

class LetterTypesController extends BaseDmsController
{
    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letter_types.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $query = LetterType::where('organization_id', $profile->organization_id);

        if ($request->filled('active')) {
            $query->where('active', $request->boolean('active'));
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'ilike', '%' . $request->search . '%')
                  ->orWhere('key', 'ilike', '%' . $request->search . '%');
            });
        }

        if ($request->boolean('paginate', false)) {
            $perPage = min(100, $request->integer('per_page', 20));
            return $query->orderBy('name')->paginate($perPage);
        }

        return $query->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letter_types.create');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $data = $request->validate([
            'key' => ['required', 'string', 'max:50', 'regex:/^[a-z0-9_]+$/'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'active' => ['boolean'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        // Check if key already exists for this organization
        $exists = LetterType::where('organization_id', $profile->organization_id)
            ->where('key', $data['key'])
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'A letter type with this key already exists'], 422);
        }

        $data['organization_id'] = $profile->organization_id;

        $letterType = LetterType::create($data);

        return response()->json($letterType, 201);
    }

    public function show(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letter_types.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $letterType = LetterType::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        return response()->json($letterType);
    }

    public function update(Request $request, string $id)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letter_types.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $letterType = LetterType::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $data = $request->validate([
            'key' => ['sometimes', 'string', 'max:50', 'regex:/^[a-z0-9_]+$/'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'active' => ['boolean'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        // If key is being updated, check if it already exists
        if (isset($data['key']) && $data['key'] !== $letterType->key) {
            $exists = LetterType::where('organization_id', $profile->organization_id)
                ->where('key', $data['key'])
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return response()->json(['error' => 'A letter type with this key already exists'], 422);
            }
        }

        $letterType->update($data);

        return response()->json($letterType);
    }

    public function destroy(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letter_types.delete');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $letterType = LetterType::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        // Check if letter type is in use
        $inUse = \DB::table('letter_templates')
            ->where('letter_type', $letterType->key)
            ->where('organization_id', $profile->organization_id)
            ->exists();

        if ($inUse) {
            return response()->json(['error' => 'This letter type is in use and cannot be deleted'], 409);
        }

        $inUse = \DB::table('letterheads')
            ->where('letter_type', $letterType->key)
            ->where('organization_id', $profile->organization_id)
            ->exists();

        if ($inUse) {
            return response()->json(['error' => 'This letter type is in use and cannot be deleted'], 409);
        }

        $letterType->delete();

        return response()->noContent();
    }
}
