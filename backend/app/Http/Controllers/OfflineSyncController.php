<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Offline-sync snapshot endpoint for the Nazim desktop client.
 *
 * Returns the slice of data that an offline desktop install needs to take
 * attendance for a single school: students, classes, attendance round names,
 * academic years, and recent attendance sessions/records.
 *
 * Supports both initial pull and delta refresh via ?since=<timestamp>.
 * Each entity is paginated independently with a stable cursor of
 * "<updated_at_iso>|<id>" so the client can resume after a dropped connection.
 */
class OfflineSyncController extends Controller
{
    /** Default page size per entity. Capped to keep responses bounded. */
    private const DEFAULT_LIMIT = 500;

    private const MAX_LIMIT = 2000;

    /** How far back to include attendance sessions on initial pull. */
    private const INITIAL_SESSIONS_LOOKBACK_DAYS = 60;

    public function snapshot(Request $request, string $schoolId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (! $this->userHasPermission($user, 'attendance.offline_sync', $profile->organization_id)) {
            return response()->json(['error' => 'Access Denied'], 403);
        }

        // The school-id segment must match the middleware-injected current school.
        // Prevents a user from snapshotting any school just by changing the URL.
        $currentSchoolId = $this->getCurrentSchoolId($request);
        if ($schoolId !== $currentSchoolId) {
            return response()->json(['error' => 'School context mismatch'], 403);
        }

        // Verify the school belongs to this organization (defence in depth).
        $schoolBelongs = DB::table('school_branding')
            ->where('id', $schoolId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->exists();
        if (! $schoolBelongs) {
            return response()->json(['error' => 'School not found'], 404);
        }

        $since = $request->query('since');
        $sinceTs = null;
        if (is_string($since) && $since !== '') {
            try {
                // In query strings, "+" is commonly decoded to a space.
                // Our tests (and some clients) pass ISO8601 with "+00:00", which becomes " 00:00".
                $normalized = str_replace(' ', '+', $since);
                $sinceTs = Carbon::parse($normalized);
            } catch (\Throwable $e) {
                return response()->json(['error' => 'Invalid since timestamp'], 422);
            }
        }

        $limit = (int) $request->integer('limit', self::DEFAULT_LIMIT);
        if ($limit < 1) {
            $limit = self::DEFAULT_LIMIT;
        }
        if ($limit > self::MAX_LIMIT) {
            $limit = self::MAX_LIMIT;
        }

        $orgId = $profile->organization_id;
        $serverTime = now()->toIso8601String();

        // Per-entity cursors.
        $cursors = [
            'students' => $this->parseCursor($request->query('students_cursor')),
            'classes' => $this->parseCursor($request->query('classes_cursor')),
            'attendance_round_names' => $this->parseCursor($request->query('attendance_round_names_cursor')),
            'academic_years' => $this->parseCursor($request->query('academic_years_cursor')),
            'attendance_sessions' => $this->parseCursor($request->query('attendance_sessions_cursor')),
            'attendance_records' => $this->parseCursor($request->query('attendance_records_cursor')),
        ];

        $school = DB::table('school_branding')
            ->where('id', $schoolId)
            ->select('id', 'organization_id', 'school_name', 'updated_at')
            ->first();

        $studentsResult = $this->paginateEntity(
            DB::table('students')
                ->where('organization_id', $orgId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->select(
                    'id', 'organization_id', 'school_id', 'card_number', 'admission_no',
                    'full_name', 'father_name', 'grandfather_name', 'gender',
                    'birth_year', 'birth_date', 'guardian_name', 'guardian_phone',
                    'is_orphan', 'student_status', 'updated_at'
                ),
            $cursors['students'],
            $sinceTs,
            $limit
        );

        $classesResult = $this->paginateEntity(
            DB::table('classes')
                ->where('organization_id', $orgId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->select('id', 'organization_id', 'school_id', 'name', 'code', 'grade_level', 'is_active', 'updated_at'),
            $cursors['classes'],
            $sinceTs,
            $limit
        );

        $roundNamesResult = $this->paginateEntity(
            DB::table('attendance_round_names')
                ->where('organization_id', $orgId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->select('id', 'organization_id', 'school_id', 'name', 'order_index', 'is_active', 'updated_at'),
            $cursors['attendance_round_names'],
            $sinceTs,
            $limit
        );

        $academicYearsResult = $this->paginateEntity(
            DB::table('academic_years')
                ->where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->select('id', 'organization_id', 'name', 'start_date', 'end_date', 'is_current', 'status', 'updated_at'),
            $cursors['academic_years'],
            $sinceTs,
            $limit
        );

        // Sessions: on initial pull restrict to the last N days; on delta, use ?since= unconditionally.
        $sessionsBase = DB::table('attendance_sessions')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at');
        if (! $sinceTs) {
            $sessionsBase->where('session_date', '>=', now()->subDays(self::INITIAL_SESSIONS_LOOKBACK_DAYS)->toDateString());
        }
        $sessionsResult = $this->paginateEntity(
            $sessionsBase->select(
                'id', 'organization_id', 'school_id', 'class_id', 'academic_year_id',
                'session_date', 'session_label', 'round_number', 'attendance_round_name_id',
                'method', 'status', 'remarks', 'student_type', 'created_by', 'closed_at',
                'created_at', 'updated_at'
            ),
            $cursors['attendance_sessions'],
            $sinceTs,
            $limit
        );

        // Records: bound to the same lookback window via the session ids we returned (best-effort).
        // For delta, just use updated_at >= since (records carry their own updated_at).
        $recordsBase = DB::table('attendance_records as r')
            ->join('attendance_sessions as s', 's.id', '=', 'r.attendance_session_id')
            ->where('r.organization_id', $orgId)
            ->where('s.school_id', $schoolId)
            ->whereNull('r.deleted_at')
            ->whereNull('s.deleted_at');
        if (! $sinceTs) {
            $recordsBase->where('s.session_date', '>=', now()->subDays(self::INITIAL_SESSIONS_LOOKBACK_DAYS)->toDateString());
        }
        $recordsResult = $this->paginateEntity(
            $recordsBase->select(
                'r.id', 'r.attendance_session_id', 'r.organization_id', 'r.school_id',
                'r.student_id', 'r.status', 'r.entry_method', 'r.marked_at', 'r.marked_by',
                'r.note', 'r.created_at', 'r.updated_at'
            ),
            $cursors['attendance_records'],
            $sinceTs,
            $limit,
            'r.updated_at',
            'r.id'
        );

        // Tombstones (soft-deleted records since `since`). Only meaningful for delta pulls.
        $tombstones = [
            'students' => [],
            'classes' => [],
            'attendance_round_names' => [],
            'attendance_sessions' => [],
            'attendance_records' => [],
        ];
        if ($sinceTs) {
            $tombstones['students'] = DB::table('students')
                ->where('organization_id', $orgId)->where('school_id', $schoolId)
                ->whereNotNull('deleted_at')->where('deleted_at', '>=', $sinceTs)
                ->pluck('id')->toArray();
            $tombstones['classes'] = DB::table('classes')
                ->where('organization_id', $orgId)->where('school_id', $schoolId)
                ->whereNotNull('deleted_at')->where('deleted_at', '>=', $sinceTs)
                ->pluck('id')->toArray();
            $tombstones['attendance_round_names'] = DB::table('attendance_round_names')
                ->where('organization_id', $orgId)->where('school_id', $schoolId)
                ->whereNotNull('deleted_at')->where('deleted_at', '>=', $sinceTs)
                ->pluck('id')->toArray();
            $tombstones['attendance_sessions'] = DB::table('attendance_sessions')
                ->where('organization_id', $orgId)->where('school_id', $schoolId)
                ->whereNotNull('deleted_at')->where('deleted_at', '>=', $sinceTs)
                ->pluck('id')->toArray();
            $tombstones['attendance_records'] = DB::table('attendance_records')
                ->where('organization_id', $orgId)->where('school_id', $schoolId)
                ->whereNotNull('deleted_at')->where('deleted_at', '>=', $sinceTs)
                ->pluck('id')->toArray();
        }

        $complete = ! ($studentsResult['next_cursor']
            || $classesResult['next_cursor']
            || $roundNamesResult['next_cursor']
            || $academicYearsResult['next_cursor']
            || $sessionsResult['next_cursor']
            || $recordsResult['next_cursor']);

        return response()->json([
            'server_time' => $serverTime,
            'school' => $school,
            'students' => $studentsResult,
            'classes' => $classesResult,
            'attendance_round_names' => $roundNamesResult,
            'academic_years' => $academicYearsResult,
            'attendance_sessions' => $sessionsResult,
            'attendance_records' => $recordsResult,
            'tombstones' => $tombstones,
            'complete' => $complete,
        ]);
    }

    /**
     * Paginate a query by (updated_at, id) cursor, optionally filtering by `since`.
     * Returns ['data' => [...], 'next_cursor' => string|null].
     */
    private function paginateEntity(
        $query,
        ?array $cursor,
        ?Carbon $since,
        int $limit,
        string $updatedAtColumn = 'updated_at',
        string $idColumn = 'id'
    ): array {
        if ($since) {
            // Force stable timestamp parsing (tests pass ISO8601 with timezone).
            $query->whereRaw("{$updatedAtColumn} >= ?", [$since->toIso8601String()]);
        }
        if ($cursor) {
            $query->where(function ($q) use ($cursor, $updatedAtColumn, $idColumn) {
                $q->where($updatedAtColumn, '>', $cursor['updated_at'])
                    ->orWhere(function ($q2) use ($cursor, $updatedAtColumn, $idColumn) {
                        $q2->where($updatedAtColumn, '=', $cursor['updated_at'])
                            ->where($idColumn, '>', $cursor['id']);
                    });
            });
        }

        $rows = $query
            ->orderBy($updatedAtColumn)
            ->orderBy($idColumn)
            ->limit($limit + 1)
            ->get()
            ->map(fn ($r) => (array) $r)
            ->all();

        $nextCursor = null;
        if (count($rows) > $limit) {
            $rows = array_slice($rows, 0, $limit);
            $last = end($rows);
            // Strip table aliases like "r." in keys.
            $updatedAtKey = $this->stripAlias($updatedAtColumn);
            $idKey = $this->stripAlias($idColumn);
            $nextCursor = $this->encodeCursor($last[$updatedAtKey] ?? null, $last[$idKey] ?? null);
        }

        return [
            'data' => $rows,
            'next_cursor' => $nextCursor,
        ];
    }

    private function parseCursor(?string $cursor): ?array
    {
        if (! $cursor) {
            return null;
        }
        $parts = explode('|', $cursor, 2);
        if (count($parts) !== 2) {
            return null;
        }
        try {
            $ts = Carbon::parse($parts[0])->toDateTimeString();
        } catch (\Throwable $e) {
            return null;
        }

        return ['updated_at' => $ts, 'id' => $parts[1]];
    }

    private function encodeCursor($updatedAt, $id): ?string
    {
        if (! $updatedAt || ! $id) {
            return null;
        }
        $ts = $updatedAt instanceof \DateTimeInterface
            ? Carbon::instance($updatedAt)->toIso8601String()
            : Carbon::parse((string) $updatedAt)->toIso8601String();

        return $ts.'|'.$id;
    }

    private function stripAlias(string $col): string
    {
        $pos = strpos($col, '.');

        return $pos === false ? $col : substr($col, $pos + 1);
    }
}
