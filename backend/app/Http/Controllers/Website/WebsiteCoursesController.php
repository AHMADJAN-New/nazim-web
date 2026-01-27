<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteCourse;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteCoursesController extends Controller
{
    private const PUBLIC_LANGUAGES = ['en', 'ps', 'fa', 'ar'];

    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $courses = WebsiteCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get();

        // Add cover_image_url to each course
        $coursesWithUrls = $courses->map(function ($course) {
            if ($course->cover_image_path) {
                $course->cover_image_url = $this->fileStorageService->getPublicUrl($course->cover_image_path);
            } else {
                $course->cover_image_url = null;
            }
            return $course;
        });

        return response()->json($coursesWithUrls);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $data = $request->validate([
            'title' => 'required|string|max:200',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'duration' => 'nullable|string|max:50',
            'level' => 'nullable|string|max:50',
            'instructor_name' => 'nullable|string|max:200',
            'cover_image_path' => 'nullable|string',
            'enrollment_cta' => 'nullable|string|max:255',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $course = WebsiteCourse::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
        ]));

        // Add cover_image_url
        if ($course->cover_image_path) {
            $course->cover_image_url = $this->fileStorageService->getPublicUrl($course->cover_image_path);
        } else {
            $course->cover_image_url = null;
        }

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($course, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $course = WebsiteCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'duration' => 'nullable|string|max:50',
            'level' => 'nullable|string|max:50',
            'instructor_name' => 'nullable|string|max:200',
            'cover_image_path' => 'nullable|string',
            'enrollment_cta' => 'nullable|string|max:255',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $course->fill(array_merge($data, ['updated_by' => $user->id]));
        $course->save();

        // Add cover_image_url
        if ($course->cover_image_path) {
            $course->cover_image_url = $this->fileStorageService->getPublicUrl($course->cover_image_path);
        } else {
            $course->cover_image_url = null;
        }

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($course);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $course = WebsiteCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $course->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['status' => 'deleted']);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        // Clear course cache - clear the base cache key (no filters) which is most commonly used
        // The cache will rebuild on next request with the correct data
        $baseCacheKey = "public-courses:{$organizationId}:{$schoolId}:" . md5('');
        Cache::forget($baseCacheKey);
        
        // Also clear common filter combinations
        Cache::forget("public-courses:{$organizationId}:{$schoolId}:" . md5('category'));
        Cache::forget("public-courses:{$organizationId}:{$schoolId}:" . md5('level'));
    }
}
