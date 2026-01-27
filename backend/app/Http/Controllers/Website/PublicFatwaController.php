<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteFatwa;
use App\Models\WebsiteFatwaCategory;
use App\Models\WebsiteFatwaQuestion;
use Illuminate\Http\Request;

class PublicFatwaController extends Controller
{
    public function categories(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');

        $categories = WebsiteFatwaCategory::where('school_id', $schoolId)
            ->where('is_active', true)
            ->whereNull('parent_id')
            ->with(['children' => function($query) {
                $query->where('is_active', true)->orderBy('sort_order')->orderBy('name');
            }])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    public function index(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $categorySlug = $request->query('category');
        $searchQuery = $request->query('search');

        $query = WebsiteFatwa::where('school_id', $schoolId)
            ->where('status', 'published')
            ->with('category');

        if ($categorySlug) {
            $category = WebsiteFatwaCategory::where('school_id', $schoolId)
                ->where('slug', $categorySlug)
                ->first();
            
            if ($category) {
                // Get fatwas for this category AND its children
                $categoryIds = [$category->id];
                $childrenIds = $category->children()->pluck('id')->toArray();
                $allCategoryIds = array_merge($categoryIds, $childrenIds);
                
                $query->whereIn('category_id', $allCategoryIds);
            }
        }

        // Add search functionality
        if ($searchQuery && !empty(trim($searchQuery))) {
            $searchTerm = '%' . trim($searchQuery) . '%';
            $query->where(function($q) use ($searchTerm) {
                $q->where('question_title', 'ILIKE', $searchTerm)
                  ->orWhere('question_text', 'ILIKE', $searchTerm)
                  ->orWhere('answer_text', 'ILIKE', $searchTerm)
                  ->orWhereHas('category', function($categoryQuery) use ($searchTerm) {
                      $categoryQuery->where('name', 'ILIKE', $searchTerm);
                  });
            });
        }

        $fatwas = $query->orderBy('published_at', 'desc')->get();

        return response()->json($fatwas);
    }

    public function show(Request $request, string $slug)
    {
        $schoolId = $request->attributes->get('school_id');

        $fatwa = WebsiteFatwa::where('school_id', $schoolId)
            ->where('slug', $slug)
            ->where('status', 'published')
            ->with('category')
            ->firstOrFail();

        return response()->json($fatwa);
    }

    public function storeQuestion(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $data = $request->validate([
            'category_id' => 'nullable|string',
            'name' => 'nullable|string|max:200',
            'email' => 'nullable|email|max:200',
            'phone' => 'nullable|string|max:80',
            'question_text' => 'required|string|max:2000',
            'is_anonymous' => 'boolean',
        ]);

        $question = WebsiteFatwaQuestion::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'category_id' => $data['category_id'] ?? null,
            'name' => $data['name'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'question_text' => $data['question_text'],
            'is_anonymous' => (bool) ($data['is_anonymous'] ?? false),
            'status' => 'new',
            'submitted_at' => now(),
        ]);

        return response()->json($question, 201);
    }
}
