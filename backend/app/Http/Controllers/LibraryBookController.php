<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LibraryBookController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('library_books.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission not present during migration
        }

        $query = LibraryBook::with([
            'copies' => function ($builder) {
                $builder->select('id', 'book_id', 'copy_code', 'status');
            },
            'category' => function ($builder) {
                $builder->select('id', 'name', 'code');
            },
        ])->withCount([
            'copies as total_copies',
            'copies as available_copies' => function ($builder) {
                $builder->where('status', 'available');
            },
        ])->where('organization_id', $profile->organization_id);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('author', 'ilike', "%{$search}%")
                    ->orWhere('isbn', 'ilike', "%{$search}%");
            });
        }

        $books = $query->orderBy('title')->get();

        return response()->json($books);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:150',
            'category_id' => 'nullable|uuid|exists:library_categories,id',
            'volume' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'deposit_amount' => 'nullable|numeric|min:0',
            'default_loan_days' => 'nullable|integer|min:1',
            'initial_copies' => 'nullable|integer|min:0',
        ]);

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('library_books.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow during migration
        }

        $book = LibraryBook::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'deposit_amount' => $data['deposit_amount'] ?? 0,
            'default_loan_days' => $data['default_loan_days'] ?? 30,
        ]));

        $copiesToCreate = (int)($data['initial_copies'] ?? 0);
        for ($i = 0; $i < $copiesToCreate; $i++) {
            LibraryCopy::create([
                'book_id' => $book->id,
                'copy_code' => $book->isbn ? $book->isbn . '-' . ($i + 1) : null,
                'status' => 'available',
            ]);
        }

        return response()->json($book->loadCount(['copies as total_copies', 'copies as available_copies' => function ($builder) {
            $builder->where('status', 'available');
        }]));
    }

    public function show(string $id)
    {
        $book = LibraryBook::with(['copies', 'category'])->findOrFail($id);
        return response()->json($book);
    }

    public function update(Request $request, string $id)
    {
        $book = LibraryBook::findOrFail($id);
        $user = $request->user();

        try {
            if (!$user->hasPermissionTo('library_books.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:150',
            'category_id' => 'nullable|uuid|exists:library_categories,id',
            'volume' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'deposit_amount' => 'nullable|numeric|min:0',
            'default_loan_days' => 'nullable|integer|min:1',
        ]);

        $book->update($data);

        return response()->json($book->fresh()->loadCount(['copies as total_copies', 'copies as available_copies' => function ($builder) {
            $builder->where('status', 'available');
        }]));
    }

    public function destroy(Request $request, string $id)
    {
        $book = LibraryBook::findOrFail($id);
        $user = $request->user();

        try {
            if (!$user->hasPermissionTo('library_books.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        $book->delete();

        return response()->json(['message' => 'Book removed']);
    }
}
