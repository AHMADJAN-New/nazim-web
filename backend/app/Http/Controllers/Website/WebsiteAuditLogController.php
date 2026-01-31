<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class WebsiteAuditLogController extends Controller
{
    private const DEFAULT_LIMIT = 200;
    private const MAX_LIMIT = 500;
    private const FETCH_LIMIT = 1000; // Fetch more logs to allow proper pagination

    /**
     * List recent website audit entries (created/updated content events).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        // Support pagination if page and per_page parameters are provided
        $usePagination = $request->has('page') || $request->has('per_page');
        
        if ($usePagination) {
            $page = max(1, (int) $request->query('page', 1));
            $perPage = (int) $request->query('per_page', 25);
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array($perPage, $allowedPerPage)) {
                $perPage = 25;
            }
        } else {
            // Backward compatibility: use limit parameter
            $limit = (int) $request->query('limit', self::DEFAULT_LIMIT);
            if ($limit < 1) {
                $limit = 1;
            }
            if ($limit > self::MAX_LIMIT) {
                $limit = self::MAX_LIMIT;
            }
        }

        // Fetch logs from all sources (fetch more to allow proper pagination)
        $fetchLimit = $usePagination ? self::FETCH_LIMIT : ($limit ?? self::DEFAULT_LIMIT);
        $logs = collect();

        foreach ($this->sources() as $source) {
            $rows = $this->fetchSourceRows(
                $source,
                $profile->organization_id,
                $schoolId,
                $fetchLimit
            );

            foreach ($rows as $row) {
                $logs = $this->appendRowLogs($logs, $row, $source);
            }
        }

        // Sort all logs by occurred_at descending
        $logs = $logs
            ->sortByDesc('occurred_at')
            ->values();

        // Get actor IDs before pagination
        $allActorIds = $logs
            ->pluck('actor_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $profiles = collect();
        if (!empty($allActorIds)) {
            $profiles = DB::table('profiles')
                ->select('id', 'full_name', 'email')
                ->whereIn('id', $allActorIds)
                ->get()
                ->keyBy('id');
        }

        // Apply pagination if requested
        if ($usePagination) {
            $total = $logs->count();
            $from = (($page - 1) * $perPage) + 1;
            $to = min($page * $perPage, $total);
            $lastPage = max(1, (int) ceil($total / $perPage));

            $paginatedLogs = $logs
                ->slice(($page - 1) * $perPage, $perPage)
                ->values();

            // Map logs with profile data
            $paginatedLogs = $paginatedLogs->map(function (array $log) use ($profiles) {
                $profile = $log['actor_id'] ? $profiles->get($log['actor_id']) : null;

                return array_merge($log, [
                    'actor_name' => $profile?->full_name ?? $profile?->email,
                    'actor_email' => $profile?->email,
                ]);
            });

            // Return paginated response structure (similar to Laravel's paginate())
            return response()->json([
                'data' => $paginatedLogs->all(),
                'current_page' => $page,
                'from' => $total > 0 ? $from : null,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'to' => $total > 0 ? $to : null,
                'total' => $total,
            ]);
        }

        // Backward compatibility: return limited results
        if ($limit > 0) {
            $logs = $logs->take($limit)->values();
        }

        // Map logs with profile data
        $logs = $logs->map(function (array $log) use ($profiles) {
            $profile = $log['actor_id'] ? $profiles->get($log['actor_id']) : null;

            return array_merge($log, [
                'actor_name' => $profile?->full_name ?? $profile?->email,
                'actor_email' => $profile?->email,
            ]);
        });

        return response()->json($logs);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function sources(): array
    {
        return [
            [
                'table' => 'website_pages',
                'type' => 'page',
                'title_column' => 'title',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_posts',
                'type' => 'post',
                'title_column' => 'title',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_announcements',
                'type' => 'announcement',
                'title_column' => 'title',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_events',
                'type' => 'event',
                'title_column' => 'title',
                'status_column' => null,
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_media_categories',
                'type' => 'media_category',
                'title_column' => 'name',
                'status_column' => null,
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_media',
                'type' => 'media',
                'title_column' => 'file_name',
                'status_column' => null,
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_menu_links',
                'type' => 'menu_link',
                'title_column' => 'label',
                'status_column' => null,
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_domains',
                'type' => 'domain',
                'title_column' => 'domain',
                'status_column' => null,
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_fatwas',
                'type' => 'fatwa',
                'title_column' => 'title',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_public_books',
                'type' => 'public_book',
                'title_column' => 'title',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_scholars',
                'type' => 'scholar',
                'title_column' => 'name',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_courses',
                'type' => 'course',
                'title_column' => 'title',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_graduates',
                'type' => 'graduate',
                'title_column' => 'name',
                'status_column' => 'status',
                'has_deleted_at' => true,
            ],
            [
                'table' => 'website_donations',
                'type' => 'donation',
                'title_column' => 'title',
                'status_column' => null,
                'has_deleted_at' => true,
            ],
        ];
    }

    private function fetchSourceRows(array $source, string $organizationId, string $schoolId, int $limit): Collection
    {
        if (!\Schema::hasTable($source['table'])) {
            return collect();
        }

        $columns = [
            'id',
            'created_at',
            'updated_at',
        ];

        $columns[] = $source['title_column'] . ' as title';

        if (!empty($source['status_column'])) {
            $columns[] = $source['status_column'] . ' as status';
        }

        $hasCreatedBy = \Schema::hasColumn($source['table'], 'created_by');
        $hasUpdatedBy = \Schema::hasColumn($source['table'], 'updated_by');

        $columns[] = $hasCreatedBy ? 'created_by' : DB::raw('null as created_by');
        $columns[] = $hasUpdatedBy ? 'updated_by' : DB::raw('null as updated_by');

        $query = DB::table($source['table'])
            ->select($columns)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId);

        if (!empty($source['has_deleted_at'])) {
            $query->whereNull('deleted_at');
        }

        return $query
            ->orderBy('updated_at', 'desc')
            ->limit($limit)
            ->get();
    }

    private function appendRowLogs(Collection $logs, object $row, array $source): Collection
    {
        $createdAt = $row->created_at ? Carbon::parse($row->created_at) : null;
        $updatedAt = $row->updated_at ? Carbon::parse($row->updated_at) : null;

        if ($createdAt) {
            $logs->push([
                'id' => $source['type'] . ':' . $row->id . ':created',
                'action' => 'created',
                'entity_type' => $source['type'],
                'entity_id' => $row->id,
                'entity_title' => $row->title ?? null,
                'status' => $row->status ?? null,
                'actor_id' => $row->created_by ?? $row->updated_by,
                'occurred_at' => $createdAt->toIso8601String(),
            ]);
        }

        if ($updatedAt && $createdAt && $updatedAt->greaterThan($createdAt)) {
            $logs->push([
                'id' => $source['type'] . ':' . $row->id . ':updated',
                'action' => 'updated',
                'entity_type' => $source['type'],
                'entity_id' => $row->id,
                'entity_title' => $row->title ?? null,
                'status' => $row->status ?? null,
                'actor_id' => $row->updated_by ?? $row->created_by,
                'occurred_at' => $updatedAt->toIso8601String(),
            ]);
        }

        return $logs;
    }
}
