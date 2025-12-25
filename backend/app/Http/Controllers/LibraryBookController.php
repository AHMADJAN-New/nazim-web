<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = LibraryBook::with([
            'copies' => function ($builder) {
                $builder->whereNull('deleted_at')
                    ->select('id', 'book_id', 'copy_code', 'status');
            },
            'category' => function ($builder) {
                $builder->select('id', 'name', 'code');
            },
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
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:100',
            'book_number' => 'required|string|max:100',
            'category' => 'nullable|string|max:150',
            'category_id' => 'required|uuid|exists:library_categories,id',
            'volume' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0.01',
            'default_loan_days' => 'nullable|integer|min:1',
            'initial_copies' => 'nullable|integer|min:0',
            'currency_id' => 'required|uuid|exists:currencies,id',
            'finance_account_id' => 'required|uuid|exists:finance_accounts,id',
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Enforce uniqueness of book_number within the school
        $bookNumberExists = DB::table('library_books')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('book_number', $data['book_number'])
            ->whereNull('deleted_at')
            ->exists();
        if ($bookNumberExists) {
            return response()->json(['error' => 'Book number already exists in this school'], 422);
        }

        // Validate and set currency_id and finance_account_id
        if (isset($data['finance_account_id']) && $data['finance_account_id']) {
            // Validate finance account belongs to organization
            $account = DB::table('finance_accounts')
                ->where('id', $data['finance_account_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (!$account) {
                return response()->json(['error' => 'Finance account not found or does not belong to your organization'], 422);
            }

            // If currency_id not provided but account has currency, use account's currency
            if (!isset($data['currency_id']) || !$data['currency_id']) {
                if ($account->currency_id) {
                    $data['currency_id'] = $account->currency_id;
                }
            }
        }

        // Validate currency_id belongs to organization
        if (isset($data['currency_id']) && $data['currency_id']) {
            $currency = DB::table('currencies')
                ->where('id', $data['currency_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (!$currency) {
                return response()->json(['error' => 'Currency not found or does not belong to your organization'], 422);
            }
        }

        // Check if category_id column exists before trying to use it
        $hasCategoryIdColumn = Schema::hasColumn('library_books', 'category_id');
        if (!$hasCategoryIdColumn && isset($data['category_id'])) {
            unset($data['category_id']);
        }

        $book = LibraryBook::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'price' => $data['price'] ?? 0,
            'default_loan_days' => $data['default_loan_days'] ?? 30,
        ]));

        $copiesToCreate = (int)($data['initial_copies'] ?? 0);
        for ($i = 0; $i < $copiesToCreate; $i++) {
            LibraryCopy::create([
                'book_id' => $book->id,
                'copy_code' => $book->isbn ? $book->isbn . '-' . ($i + 1) : null,
                'status' => 'available',
                'school_id' => $currentSchoolId,
            ]);
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
            if (!$user->hasPermissionTo('library_books.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:100',
            'book_number' => 'required|string|max:100',
            'category' => 'nullable|string|max:150',
            'category_id' => 'required|uuid|exists:library_categories,id',
            'volume' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0.01',
            'default_loan_days' => 'nullable|integer|min:1',
            'currency_id' => 'required|uuid|exists:currencies,id',
            'finance_account_id' => 'required|uuid|exists:finance_accounts,id',
        ]);

        if ($profile && $profile->organization_id) {
            // Enforce uniqueness of book_number within school
            $bookNumberExists = DB::table('library_books')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('book_number', $data['book_number'])
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->exists();
            if ($bookNumberExists) {
                return response()->json(['error' => 'Book number already exists in this school'], 422);
            }

            // Validate and set currency_id and finance_account_id
            if (isset($data['finance_account_id']) && $data['finance_account_id']) {
                // Validate finance account belongs to organization
                $account = DB::table('finance_accounts')
                    ->where('id', $data['finance_account_id'])
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$account) {
                    return response()->json(['error' => 'Finance account not found or does not belong to your organization'], 422);
                }

                // If currency_id not provided but account has currency, use account's currency
                if (!isset($data['currency_id']) || !$data['currency_id']) {
                    if ($account->currency_id) {
                        $data['currency_id'] = $account->currency_id;
                    }
                }
            }

            // Validate currency_id belongs to organization
            if (isset($data['currency_id']) && $data['currency_id']) {
                $currency = DB::table('currencies')
                    ->where('id', $data['currency_id'])
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$currency) {
                    return response()->json(['error' => 'Currency not found or does not belong to your organization'], 422);
                }
            }
        }

        // Check if category_id column exists before trying to update it
        $hasCategoryIdColumn = Schema::hasColumn('library_books', 'category_id');
        if (!$hasCategoryIdColumn && isset($data['category_id'])) {
            unset($data['category_id']);
        }

        $book->update($data);

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
            if (!$user->hasPermissionTo('library_books.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        $book->delete();

        return response()->noContent();
    }
}
