<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LibraryCopyController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('library_copies.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for library_copies.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $data = $request->validate([
            'book_id' => 'required|uuid|exists:library_books,id',
            'copy_code' => 'nullable|string|max:100',
            'status' => 'nullable|string',
            'acquired_at' => 'nullable|date',
        ]);

        $book = LibraryBook::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($data['book_id']);

        if (!$book) {
            return response()->json(['error' => 'Book not found'], 404);
        }

        $copy = LibraryCopy::create([
            'book_id' => $data['book_id'],
            'school_id' => $currentSchoolId,
            'copy_code' => $data['copy_code'] ?? null,
            'status' => $data['status'] ?? 'available',
            'acquired_at' => $data['acquired_at'] ?? null,
        ]);

        return response()->json($copy, 201);
    }

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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('library_copies.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for library_copies.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $copy = LibraryCopy::where('school_id', $currentSchoolId)->find($id);
        if (!$copy) {
            return response()->json(['error' => 'Copy not found'], 404);
        }

        $data = $request->validate([
            'copy_code' => 'nullable|string|max:100',
            'status' => 'nullable|string',
            'acquired_at' => 'nullable|date',
        ]);
        $copy->update($data);

        return response()->json($copy);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('library_copies.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for library_copies.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $copy = LibraryCopy::where('school_id', $currentSchoolId)->find($id);
        if (!$copy) {
            return response()->json(['error' => 'Copy not found'], 404);
        }

        $copy->delete();

        return response()->noContent();
    }
}
