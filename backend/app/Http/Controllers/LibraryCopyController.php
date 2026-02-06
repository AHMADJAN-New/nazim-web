<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LibraryCopyController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {
    }

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

        // Log library copy creation
        try {
            $bookTitle = $book->title ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $copy,
                description: "Added copy {$copy->copy_code ?? 'N/A'} for library book {$bookTitle}",
                properties: [
                    'library_copy_id' => $copy->id,
                    'book_id' => $copy->book_id,
                    'copy_code' => $copy->copy_code,
                    'status' => $copy->status,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log library copy creation: ' . $e->getMessage());
        }

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

        // Capture old values before update
        $oldValues = $copy->only(['copy_code', 'status', 'acquired_at']);

        $data = $request->validate([
            'copy_code' => 'nullable|string|max:100',
            'status' => 'nullable|string',
            'acquired_at' => 'nullable|date',
        ]);
        $copy->update($data);

        // Log library copy update
        try {
            $copy->load('book');
            $bookTitle = $copy->book?->title ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $copy,
                description: "Updated copy {$copy->copy_code ?? 'N/A'} for library book {$bookTitle}",
                properties: [
                    'library_copy_id' => $copy->id,
                    'book_id' => $copy->book_id,
                    'old_values' => $oldValues,
                    'new_values' => $copy->only(['copy_code', 'status', 'acquired_at']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log library copy update: ' . $e->getMessage());
        }

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

        // Load book for logging
        $copy->load('book');

        // Log library copy deletion
        try {
            $bookTitle = $copy->book?->title ?? 'Unknown';
            $this->activityLogService->logDelete(
                subject: $copy,
                description: "Removed copy {$copy->copy_code ?? 'N/A'} for library book {$bookTitle}",
                properties: [
                    'library_copy_id' => $copy->id,
                    'book_id' => $copy->book_id,
                    'copy_code' => $copy->copy_code,
                    'status' => $copy->status,
                    'deleted_entity' => $copy->toArray(),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log library copy deletion: ' . $e->getMessage());
        }

        $copy->delete();

        return response()->noContent();
    }
}
