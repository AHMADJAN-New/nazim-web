<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\AssetMaintenanceRecord;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Building;
use App\Models\ClassModel;
use App\Models\LeaveRequest;
use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Models\LibraryLoan;
use App\Models\Room;
use App\Models\Staff;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get comprehensive dashboard statistics
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Set organization context for permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        $orgId = $profile->organization_id;

        // Get accessible school IDs (if needed for filtering)
        $schoolIds = $this->getAccessibleSchoolIds($profile);

        // Fetch all statistics in parallel for better performance
        $stats = [
            'students' => $this->getStudentStats($orgId, $schoolIds),
            'staff' => $this->getStaffStats($orgId, $schoolIds),
            'classes' => $this->getClassStats($orgId),
            'rooms' => $this->getRoomStats($orgId),
            'buildings' => $this->getBuildingStats($orgId),
            'assets' => $this->getAssetStats($orgId, $schoolIds),
            'books' => $this->getBookStats($orgId),
            'leave_requests' => $this->getLeaveRequestStats($orgId),
            'attendance' => $this->getAttendanceStats($orgId),
            'hostel' => $this->getHostelStats($orgId),
        ];

        return response()->json($stats);
    }

    /**
     * Get student statistics
     */
    private function getStudentStats($orgId, $schoolIds)
    {
        try {
            $query = Student::where('organization_id', $orgId)
                ->whereNull('deleted_at');

            if (!empty($schoolIds)) {
                $query->whereIn('school_id', $schoolIds);
            }

            $total = $query->count();
            $male = (clone $query)->where('gender', 'male')->count();
            $female = (clone $query)->where('gender', 'female')->count();

            return [
                'total' => $total,
                'male' => $male,
                'female' => $female,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching student stats: ' . $e->getMessage());
            return ['total' => 0, 'male' => 0, 'female' => 0];
        }
    }

    /**
     * Get staff statistics
     */
    private function getStaffStats($orgId, $schoolIds)
    {
        try {
            $query = Staff::where('organization_id', $orgId)
                ->whereNull('deleted_at');

            if (!empty($schoolIds)) {
                $query->whereIn('school_id', $schoolIds);
            }

            return [
                'total' => $query->count(),
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching staff stats: ' . $e->getMessage());
            return ['total' => 0];
        }
    }

    /**
     * Get class statistics
     */
    private function getClassStats($orgId)
    {
        try {
            $total = ClassModel::where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->count();

            return [
                'total' => $total,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching class stats: ' . $e->getMessage());
            return ['total' => 0];
        }
    }

    /**
     * Get room statistics
     */
    private function getRoomStats($orgId)
    {
        try {
            $total = Room::where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->count();

            return [
                'total' => $total,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching room stats: ' . $e->getMessage());
            return ['total' => 0];
        }
    }

    /**
     * Get building statistics
     */
    private function getBuildingStats($orgId)
    {
        try {
            $total = Building::where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->count();

            return [
                'total' => $total,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching building stats: ' . $e->getMessage());
            return ['total' => 0];
        }
    }

    /**
     * Get asset statistics
     */
    private function getAssetStats($orgId, $schoolIds)
    {
        try {
            $baseQuery = Asset::where('organization_id', $orgId)
                ->whereNull('deleted_at');

            if (!empty($schoolIds)) {
                $baseQuery->where(function ($q) use ($schoolIds) {
                    $q->whereNull('school_id')
                        ->orWhereIn('school_id', $schoolIds);
                });
            }

            $statusCounts = (clone $baseQuery)
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status')
                ->toArray();

            $assetIds = (clone $baseQuery)->pluck('id');
            
            // Calculate total value: purchase_price × total_copies (at least 1 copy)
            $assets = (clone $baseQuery)
                ->whereNotNull('purchase_price')
                ->where('purchase_price', '>', 0)
                ->get();
            
            $totalValue = 0;
            foreach ($assets as $asset) {
                $price = (float) $asset->purchase_price;
                $copies = max(1, (int) ($asset->total_copies ?? 1)); // At least 1 copy
                $totalValue += $price * $copies;
            }

            $maintenanceCost = 0;
            if ($assetIds->isNotEmpty()) {
                $maintenanceCost = (float) AssetMaintenanceRecord::where('organization_id', $orgId)
                    ->whereIn('asset_id', $assetIds)
                    ->sum('cost');
            }

            return [
                'total' => (clone $baseQuery)->count(),
                'total_value' => $totalValue,
                'maintenance_cost' => $maintenanceCost,
                'status_counts' => $statusCounts,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching asset stats: ' . $e->getMessage());
            return [
                'total' => 0,
                'total_value' => 0,
                'maintenance_cost' => 0,
                'status_counts' => [],
            ];
        }
    }

    /**
     * Get book statistics
     */
    private function getBookStats($orgId)
    {
        try {
            $totalBooks = LibraryBook::where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->count();

            // Get total copies and available copies
            // Join with library_books to filter by organization_id
            $totalCopies = DB::table('library_copies')
                ->join('library_books', 'library_copies.book_id', '=', 'library_books.id')
                ->where('library_books.organization_id', $orgId)
                ->whereNull('library_copies.deleted_at')
                ->whereNull('library_books.deleted_at')
                ->count();

            $availableCopies = DB::table('library_copies')
                ->join('library_books', 'library_copies.book_id', '=', 'library_books.id')
                ->where('library_books.organization_id', $orgId)
                ->where('library_copies.status', 'available')
                ->whereNull('library_copies.deleted_at')
                ->whereNull('library_books.deleted_at')
                ->count();

            $onLoan = $totalCopies - $availableCopies;

            return [
                'total_books' => $totalBooks,
                'total_copies' => $totalCopies,
                'available_copies' => $availableCopies,
                'on_loan' => $onLoan,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching book stats: ' . $e->getMessage());
            return [
                'total_books' => 0,
                'total_copies' => 0,
                'available_copies' => 0,
                'on_loan' => 0,
            ];
        }
    }

    /**
     * Get leave request statistics
     */
    private function getLeaveRequestStats($orgId)
    {
        try {
            $query = LeaveRequest::where('organization_id', $orgId)
                ->whereNull('deleted_at');

            $total = $query->count();
            $pending = (clone $query)->where('status', 'pending')->count();
            $approved = (clone $query)->where('status', 'approved')->count();
            $rejected = (clone $query)->where('status', 'rejected')->count();

            return [
                'total' => $total,
                'pending' => $pending,
                'approved' => $approved,
                'rejected' => $rejected,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching leave request stats: ' . $e->getMessage());
            return [
                'total' => 0,
                'pending' => 0,
                'approved' => 0,
                'rejected' => 0,
            ];
        }
    }

    /**
     * Get attendance statistics
     */
    private function getAttendanceStats($orgId)
    {
        try {
            $today = now()->toDateString();

            // Get today's attendance sessions
            $todaySessions = AttendanceSession::where('organization_id', $orgId)
                ->whereDate('session_date', $today)
                ->whereNull('deleted_at')
                ->get();

            $totalPresent = 0;
            $totalAbsent = 0;
            $totalStudents = 0;

            foreach ($todaySessions as $session) {
                $records = AttendanceRecord::where('attendance_session_id', $session->id)
                    ->whereNull('deleted_at')
                    ->get();

                foreach ($records as $record) {
                    $totalStudents++;
                    if ($record->status === 'present') {
                        $totalPresent++;
                    } elseif ($record->status === 'absent') {
                        $totalAbsent++;
                    }
                }
            }

            $attendancePercentage = $totalStudents > 0
                ? round(($totalPresent / $totalStudents) * 100)
                : 0;

            // Get weekly attendance trend (last 7 days)
            $last7Days = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i)->toDateString();
                $daySessions = AttendanceSession::where('organization_id', $orgId)
                    ->whereDate('session_date', $date)
                    ->whereNull('deleted_at')
                    ->get();

                $present = 0;
                $total = 0;

                foreach ($daySessions as $session) {
                    $records = AttendanceRecord::where('attendance_session_id', $session->id)
                        ->whereNull('deleted_at')
                        ->get();

                    foreach ($records as $record) {
                        $total++;
                        if ($record->status === 'present') {
                            $present++;
                        }
                    }
                }

                $percentage = $total > 0 ? round(($present / $total) * 100) : 0;

                $last7Days[] = [
                    'date' => now()->subDays($i)->format('D'), // Day abbreviation
                    'percentage' => $percentage,
                    'present' => $present,
                    'total' => $total,
                ];
            }

            return [
                'today' => [
                    'percentage' => $attendancePercentage,
                    'present' => $totalPresent,
                    'absent' => $totalAbsent,
                    'total' => $totalStudents,
                ],
                'weekly_trend' => $last7Days,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching attendance stats: ' . $e->getMessage());
            return [
                'today' => [
                    'percentage' => 0,
                    'present' => 0,
                    'absent' => 0,
                    'total' => 0,
                ],
                'weekly_trend' => [],
            ];
        }
    }

    /**
     * Get hostel statistics
     */
    private function getHostelStats($orgId)
    {
        try {
            // This would need to be implemented based on your hostel structure
            // For now, returning placeholder data
            return [
                'total_rooms' => 0,
                'occupied_rooms' => 0,
                'total_students' => 0,
                'occupancy_percentage' => 0,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error fetching hostel stats: ' . $e->getMessage());
            return [
                'total_rooms' => 0,
                'occupied_rooms' => 0,
                'total_students' => 0,
                'occupancy_percentage' => 0,
            ];
        }
    }

}

