<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class LibraryBookController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo('library_books.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission not present during migration
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = LibraryBook::with([
            'copies' => function ($builder) {
                $builder->whereNull('deleted_at')
                    ->select('id', 'book_id', 'copy_code', 'status');
            },
            // Load full category row — constrained select() can prevent belongsTo from hydrating in some setups
            'category',
            'currency' => function ($builder) {
                $builder->select('id', 'code', 'name', 'symbol');
            },
            'financeAccount' => function ($builder) {
                $builder->select('id', 'name', 'code', 'currency_id')
                    ->with(['currency' => function ($q) {
                        $q->select('id', 'code', 'name', 'symbol');
                    }]);
            },
        ])->withCount([
            'copies as total_copies' => function ($builder) {
                $builder->whereNull('deleted_at');
            },
            'copies as available_copies' => function ($builder) {
                $builder->where('status', 'available')
                    ->whereNull('deleted_at');
            },
        ])->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('author', 'ilike', "%{$search}%")
                    ->orWhere('isbn', 'ilike', "%{$search}%")
                    ->orWhere('book_number', 'ilike', "%{$search}%");
            });
        }

        // Support pagination if page and per_page are provided
        if ($request->has('page') && $request->has('per_page')) {
            $perPage = (int) $request->get('per_page', 25);
            $books = $query->orderBy('title')->paginate($perPage);

            return response()->json($books);
        }

        $books = $query->orderBy('title')->get();

        return response()->json($books);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo('library_books.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow during migration
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $this->trimLibraryBookRequest($request);

        $data = $request->validate($this->libraryBookStoreValidationRules($profile, $currentSchoolId));

        // Check if category_id column exists before trying to use it
        $hasCategoryIdColumn = Schema::hasColumn('library_books', 'category_id');
        if (! $hasCategoryIdColumn && isset($data['category_id'])) {
            unset($data['category_id']);
        }

        $book = LibraryBook::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'price' => $data['price'] ?? 0,
            'default_loan_days' => $data['default_loan_days'] ?? 30,
        ]));

        $copiesToCreate = (int) ($data['initial_copies'] ?? 0);
        for ($i = 0; $i < $copiesToCreate; $i++) {
            LibraryCopy::create([
                'book_id' => $book->id,
                'copy_code' => $book->isbn ? $book->isbn.'-'.($i + 1) : null,
                'status' => 'available',
                'school_id' => $currentSchoolId,
            ]);
        }

        // Log library book creation
        try {
            $categoryName = $book->category?->name ?? 'Uncategorized';
            $this->activityLogService->logCreate(
                subject: $book,
                description: "Added library book: {$book->title} by {$book->author} ({$categoryName})",
                properties: [
                    'library_book_id' => $book->id,
                    'title' => $book->title,
                    'author' => $book->author,
                    'book_number' => $book->book_number,
                    'category_id' => $book->category_id,
                    'initial_copies' => $copiesToCreate,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to log library book creation: '.$e->getMessage());
        }

        return response()->json($book->load(['category', 'currency', 'financeAccount.currency'])->loadCount(['copies as total_copies', 'copies as available_copies' => function ($builder) {
            $builder->where('status', 'available');
        }]));
    }

    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = request()->get('current_school_id');

        $book = LibraryBook::with(['copies', 'category', 'currency', 'financeAccount.currency'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        return response()->json($book);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $book = LibraryBook::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        try {
            if (! $user->hasPermissionTo('library_books.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        // Capture old values before update
        $oldValues = $book->only([
            'title', 'author', 'isbn', 'book_number', 'category_id', 'price', 'default_loan_days',
        ]);

        $this->trimLibraryBookRequest($request);

        $data = $request->validate($this->libraryBookUpdateValidationRules($profile, $currentSchoolId, $id));

        // Check if category_id column exists before trying to update it
        $hasCategoryIdColumn = Schema::hasColumn('library_books', 'category_id');
        if (! $hasCategoryIdColumn && isset($data['category_id'])) {
            unset($data['category_id']);
        }

        $book->update($data);

        // Log library book update
        try {
            $categoryName = $book->category?->name ?? 'Uncategorized';
            $this->activityLogService->logUpdate(
                subject: $book,
                description: "Updated library book: {$book->title} by {$book->author} ({$categoryName})",
                properties: [
                    'library_book_id' => $book->id,
                    'old_values' => $oldValues,
                    'new_values' => $book->only([
                        'title', 'author', 'isbn', 'book_number', 'category_id', 'price', 'default_loan_days',
                    ]),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to log library book update: '.$e->getMessage());
        }

        return response()->json($book->fresh()->load(['category', 'currency', 'financeAccount.currency'])->loadCount(['copies as total_copies', 'copies as available_copies' => function ($builder) {
            $builder->where('status', 'available');
        }]));
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $book = LibraryBook::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->findOrFail($id);

        try {
            if (! $user->hasPermissionTo('library_books.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        // Load relationships for logging
        $book->load(['category']);

        // Log library book deletion
        try {
            $categoryName = $book->category?->name ?? 'Uncategorized';
            $this->activityLogService->logDelete(
                subject: $book,
                description: "Deleted library book: {$book->title} by {$book->author} ({$categoryName})",
                properties: [
                    'library_book_id' => $book->id,
                    'title' => $book->title,
                    'author' => $book->author,
                    'book_number' => $book->book_number,
                    'category_id' => $book->category_id,
                    'deleted_entity' => $book->toArray(),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to log library book deletion: '.$e->getMessage());
        }

        $book->delete();

        return response()->noContent();
    }

    /**
     * Trim book text fields so book numbers match after whitespace and optional fields store as null.
     */
    private function trimLibraryBookRequest(Request $request): void
    {
        $merge = [];

        foreach (['title', 'book_number'] as $key) {
            $v = $request->input($key);
            $merge[$key] = is_string($v) ? trim($v) : $v;
        }

        foreach (['author', 'isbn', 'category', 'volume', 'description'] as $key) {
            $v = $request->input($key);
            if (! is_string($v)) {
                $merge[$key] = $v;

                continue;
            }
            $t = trim($v);
            $merge[$key] = $t === '' ? null : $t;
        }

        $request->merge($merge);
    }

    /**
     * @param  \stdClass  $profile
     * @return array<string, mixed>
     */
    private function libraryBookStoreValidationRules(object $profile, string $currentSchoolId): array
    {
        return [
            'title' => 'required|string|min:1|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:100',
            'book_number' => [
                'required',
                'string',
                'min:1',
                'max:100',
                Rule::unique('library_books', 'book_number')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
            'category' => 'nullable|string|max:150',
            'category_id' => [
                'required',
                'uuid',
                Rule::exists('library_categories', 'id')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
            'volume' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0.01',
            'default_loan_days' => 'nullable|integer|min:1',
            'initial_copies' => 'nullable|integer|min:0',
            'currency_id' => [
                'required',
                'uuid',
                Rule::exists('currencies', 'id')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
            'finance_account_id' => [
                'required',
                'uuid',
                Rule::exists('finance_accounts', 'id')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /**
     * @param  \stdClass  $profile
     * @return array<string, mixed>
     */
    private function libraryBookUpdateValidationRules(object $profile, string $currentSchoolId, string $bookId): array
    {
        return [
            'title' => 'sometimes|required|string|min:1|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:100',
            'book_number' => [
                'required',
                'string',
                'min:1',
                'max:100',
                Rule::unique('library_books', 'book_number')
                    ->ignore($bookId)
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
            'category' => 'nullable|string|max:150',
            'category_id' => [
                'required',
                'uuid',
                Rule::exists('library_categories', 'id')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
            'volume' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0.01',
            'default_loan_days' => 'nullable|integer|min:1',
            'currency_id' => [
                'required',
                'uuid',
                Rule::exists('currencies', 'id')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
            'finance_account_id' => [
                'required',
                'uuid',
                Rule::exists('finance_accounts', 'id')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at'),
            ],
        ];
    }
}
