<?php

namespace App\Http\Controllers\Fees;

use App\Http\Controllers\Controller;
use App\Models\FeeAssignment;
use App\Models\FeePayment;
use App\Models\FeeStructure;
use App\Models\FeeException;
use App\Models\StudentAdmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeeReportController extends Controller
{
    /**
     * Fee Dashboard - Overview of fee collection status
     */
    public function dashboard(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('fees.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for fees.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
                'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            ]);

            $orgId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Build base query for assignments
            $baseQuery = FeeAssignment::whereNull('deleted_at')
                ->where('organization_id', $orgId);
            $baseQuery->where('school_id', $currentSchoolId);

            if (!empty($validated['academic_year_id'])) {
                $baseQuery->where('academic_year_id', $validated['academic_year_id']);
            }

            if (!empty($validated['class_academic_year_id'])) {
                $baseQuery->where('class_academic_year_id', $validated['class_academic_year_id']);
            }

            // Summary statistics
            $summary = DB::table('fee_assignments')
                ->whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('academic_year_id', $validated['academic_year_id']))
                ->when(!empty($validated['class_academic_year_id']), fn($q) => $q->where('class_academic_year_id', $validated['class_academic_year_id']))
                ->selectRaw('
                    COUNT(*) as total_assignments,
                    COUNT(DISTINCT student_id) as total_students,
                    COALESCE(SUM(assigned_amount), 0) as total_assigned,
                    COALESCE(SUM(paid_amount), 0) as total_paid,
                    COALESCE(SUM(remaining_amount), 0) as total_remaining,
                    COUNT(CASE WHEN status = \'paid\' THEN 1 END) as paid_count,
                    COUNT(CASE WHEN status = \'partial\' THEN 1 END) as partial_count,
                    COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = \'overdue\' THEN 1 END) as overdue_count,
                    COUNT(CASE WHEN status = \'waived\' THEN 1 END) as waived_count
                ')
                ->first();

            // Fee collection by class
            $byClass = DB::table('fee_assignments')
                ->whereNull('fee_assignments.deleted_at')
                ->where('fee_assignments.organization_id', $orgId)
                ->where('fee_assignments.school_id', $currentSchoolId)
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('fee_assignments.academic_year_id', $validated['academic_year_id']))
                ->leftJoin('class_academic_years', 'fee_assignments.class_academic_year_id', '=', 'class_academic_years.id')
                ->leftJoin('classes', 'class_academic_years.class_id', '=', 'classes.id')
                ->whereNotNull('classes.id') // Only include assignments with valid classes
                ->groupBy('fee_assignments.class_academic_year_id', 'classes.name', 'classes.id')
                ->selectRaw('
                    fee_assignments.class_academic_year_id,
                    classes.id as class_id,
                    COALESCE(classes.name, \'Unknown\') as class_name,
                    COUNT(*) as assignment_count,
                    COUNT(DISTINCT fee_assignments.student_id) as student_count,
                    COALESCE(SUM(fee_assignments.assigned_amount), 0) as total_assigned,
                    COALESCE(SUM(fee_assignments.paid_amount), 0) as total_paid,
                    COALESCE(SUM(fee_assignments.remaining_amount), 0) as total_remaining,
                    CASE WHEN COALESCE(SUM(fee_assignments.assigned_amount), 0) > 0
                        THEN ROUND((COALESCE(SUM(fee_assignments.paid_amount), 0) / COALESCE(SUM(fee_assignments.assigned_amount), 1)) * 100, 2)
                        ELSE 0 END as collection_percentage
                ')
                ->orderBy('classes.name')
                ->get();

            // Fee collection by structure
            $byStructure = DB::table('fee_assignments')
                ->whereNull('fee_assignments.deleted_at')
                ->where('fee_assignments.organization_id', $orgId)
                ->where('fee_assignments.school_id', $currentSchoolId)
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('fee_assignments.academic_year_id', $validated['academic_year_id']))
                ->when(!empty($validated['class_academic_year_id']), fn($q) => $q->where('fee_assignments.class_academic_year_id', $validated['class_academic_year_id']))
                ->leftJoin('fee_structures', 'fee_assignments.fee_structure_id', '=', 'fee_structures.id')
                ->groupBy('fee_assignments.fee_structure_id', 'fee_structures.name', 'fee_structures.fee_type')
                ->selectRaw('
                    fee_assignments.fee_structure_id,
                    fee_structures.name as structure_name,
                    fee_structures.fee_type,
                    COUNT(*) as assignment_count,
                    COALESCE(SUM(fee_assignments.assigned_amount), 0) as total_assigned,
                    COALESCE(SUM(fee_assignments.paid_amount), 0) as total_paid,
                    COALESCE(SUM(fee_assignments.remaining_amount), 0) as total_remaining
                ')
                ->orderBy('fee_structures.name')
                ->get();

            // Recent payments
            $recentPayments = FeePayment::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->with(['student:id,full_name,admission_no', 'feeAssignment.feeStructure:id,name'])
                ->orderBy('payment_date', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'amount' => (float) $payment->amount,
                        'payment_date' => $payment->payment_date,
                        'payment_method' => $payment->payment_method,
                        'reference_no' => $payment->reference_no,
                        'student_name' => $payment->student?->full_name ?? null,
                        'student_registration' => $payment->student?->admission_no ?? null,
                        'fee_structure_name' => $payment->feeAssignment?->feeStructure?->name ?? null,
                    ];
                });

            // Exception statistics
            $exceptionBaseQuery = DB::table('fee_exceptions')
                ->whereNull('fee_exceptions.deleted_at')
                ->where('fee_exceptions.organization_id', $orgId)
                ->where('fee_exceptions.is_active', true)
                ->join('fee_assignments', 'fee_exceptions.fee_assignment_id', '=', 'fee_assignments.id')
                ->whereNull('fee_assignments.deleted_at')
                ->where('fee_assignments.school_id', $currentSchoolId)
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('fee_assignments.academic_year_id', $validated['academic_year_id']))
                ->when(!empty($validated['class_academic_year_id']), fn($q) => $q->where('fee_assignments.class_academic_year_id', $validated['class_academic_year_id']))
                ;

            $exceptionTotal = (float) (clone $exceptionBaseQuery)->sum('fee_exceptions.exception_amount');
            $exceptionCount = (int) (clone $exceptionBaseQuery)->count();

            // Get total original amount (before exceptions) from assignments
            $originalTotalQuery = FeeAssignment::whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('academic_year_id', $validated['academic_year_id']))
                ->when(!empty($validated['class_academic_year_id']), fn($q) => $q->where('class_academic_year_id', $validated['class_academic_year_id']))
                ;

            $originalTotal = (float) $originalTotalQuery->sum('original_amount') ?: (float) $summary->total_assigned;
            $adjustedTotal = (float) $summary->total_assigned;
            $exceptionReduction = $originalTotal - $adjustedTotal;

            // Exception statistics by type
            $exceptionsByType = DB::table('fee_exceptions')
                ->whereNull('fee_exceptions.deleted_at')
                ->where('fee_exceptions.organization_id', $orgId)
                ->where('fee_exceptions.is_active', true)
                ->join('fee_assignments', 'fee_exceptions.fee_assignment_id', '=', 'fee_assignments.id')
                ->whereNull('fee_assignments.deleted_at')
                ->where('fee_assignments.school_id', $currentSchoolId)
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('fee_assignments.academic_year_id', $validated['academic_year_id']))
                ->when(!empty($validated['class_academic_year_id']), fn($q) => $q->where('fee_assignments.class_academic_year_id', $validated['class_academic_year_id']))
                ->groupBy('fee_exceptions.exception_type')
                ->selectRaw('
                    fee_exceptions.exception_type,
                    COUNT(*) as count,
                    COALESCE(SUM(fee_exceptions.exception_amount), 0) as total_amount
                ')
                ->get();

            $exceptionStats = [
                'total_count' => $exceptionCount,
                'total_amount' => $exceptionTotal,
                'by_type' => [
                    'discount_percentage' => [
                        'count' => 0,
                        'amount' => 0.0,
                    ],
                    'discount_fixed' => [
                        'count' => 0,
                        'amount' => 0.0,
                    ],
                    'waiver' => [
                        'count' => 0,
                        'amount' => 0.0,
                    ],
                    'custom' => [
                        'count' => 0,
                        'amount' => 0.0,
                    ],
                ],
                'impact_on_collection' => [
                    'original_total' => $originalTotal,
                    'adjusted_total' => $adjustedTotal,
                    'exception_reduction' => $exceptionReduction,
                ],
            ];

            // Populate exception stats by type
            foreach ($exceptionsByType as $exception) {
                $type = $exception->exception_type;
                if (isset($exceptionStats['by_type'][$type])) {
                    $exceptionStats['by_type'][$type]['count'] = (int) $exception->count;
                    $exceptionStats['by_type'][$type]['amount'] = (float) $exception->total_amount;
                }
            }

            return response()->json([
                'summary' => [
                    'total_assignments' => (int) $summary->total_assignments,
                    'total_students' => (int) $summary->total_students,
                    'total_assigned' => (float) $summary->total_assigned,
                    'total_paid' => (float) $summary->total_paid,
                    'total_remaining' => (float) $summary->total_remaining,
                    'collection_rate' => $summary->total_assigned > 0
                        ? round(($summary->total_paid / $summary->total_assigned) * 100, 2)
                        : 0,
                    'status_counts' => [
                        'paid' => (int) $summary->paid_count,
                        'partial' => (int) $summary->partial_count,
                        'pending' => (int) $summary->pending_count,
                        'overdue' => (int) $summary->overdue_count,
                        'waived' => (int) $summary->waived_count,
                    ],
                ],
                'by_class' => $byClass,
                'by_structure' => $byStructure,
                'recent_payments' => $recentPayments,
                'exceptions' => $exceptionStats,
            ]);
        } catch (\Exception $e) {
            \Log::error('FeeReportController@dashboard error: ' . $e->getMessage());
            \Log::error('FeeReportController@dashboard stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'An error occurred while fetching fee dashboard data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Student Fee Report - List students with their fee status
     */
    public function studentFees(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('fees.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
                'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
                'status' => 'nullable|in:pending,partial,paid,overdue,waived,cancelled',
                'search' => 'nullable|string|max:100',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            $orgId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);
            $page = $validated['page'] ?? 1;
            $perPage = $validated['per_page'] ?? 25;

            // Query students with aggregated fee data
            $query = DB::table('students')
                ->whereNull('students.deleted_at')
                ->where('students.organization_id', $orgId)
                ->where('students.school_id', $currentSchoolId)
                ->join('fee_assignments', function($join) {
                    $join->on('students.id', '=', 'fee_assignments.student_id')
                        ->whereNull('fee_assignments.deleted_at');
                })
                ->leftJoin('student_admissions', 'fee_assignments.student_admission_id', '=', 'student_admissions.id')
                ->leftJoin('class_academic_years', 'fee_assignments.class_academic_year_id', '=', 'class_academic_years.id')
                ->leftJoin('classes', 'class_academic_years.class_id', '=', 'classes.id')
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('fee_assignments.academic_year_id', $validated['academic_year_id']))
                ->when(!empty($validated['class_academic_year_id']), fn($q) => $q->where('fee_assignments.class_academic_year_id', $validated['class_academic_year_id']))
                ->where('fee_assignments.school_id', $currentSchoolId)
                ->when(!empty($validated['search']), function($q) use ($validated) {
                    $search = '%' . $validated['search'] . '%';
                    $q->where(function($sub) use ($search) {
                        $sub->where('students.full_name', 'ilike', $search)
                            ->orWhere('students.admission_no', 'ilike', $search)
                            ->orWhere('students.father_name', 'ilike', $search);
                    });
                })
                ->groupBy('students.id', 'students.full_name', 'students.father_name',
                    'students.admission_no', 'students.picture_path', 'classes.name', 'fee_assignments.class_academic_year_id')
                ->selectRaw('
                    students.id,
                    students.full_name,
                    students.father_name,
                    students.admission_no as registration_number,
                    students.picture_path,
                    classes.name as class_name,
                    fee_assignments.class_academic_year_id,
                    COUNT(fee_assignments.id) as assignment_count,
                    COALESCE(SUM(fee_assignments.assigned_amount), 0) as total_assigned,
                    COALESCE(SUM(fee_assignments.paid_amount), 0) as total_paid,
                    COALESCE(SUM(fee_assignments.remaining_amount), 0) as total_remaining,
                    CASE
                        WHEN COALESCE(SUM(fee_assignments.remaining_amount), 0) <= 0 THEN \'paid\'
                        WHEN COALESCE(SUM(fee_assignments.paid_amount), 0) > 0 THEN \'partial\'
                        WHEN MAX(CASE WHEN fee_assignments.status = \'overdue\' THEN 1 ELSE 0 END) = 1 THEN \'overdue\'
                        ELSE \'pending\'
                    END as overall_status
                ');

            // Apply status filter after grouping
            if (!empty($validated['status'])) {
                $status = $validated['status'];
                $query->havingRaw(match($status) {
                    'paid' => "COALESCE(SUM(fee_assignments.remaining_amount), 0) <= 0",
                    'partial' => "COALESCE(SUM(fee_assignments.paid_amount), 0) > 0 AND COALESCE(SUM(fee_assignments.remaining_amount), 0) > 0",
                    'pending' => "COALESCE(SUM(fee_assignments.paid_amount), 0) = 0 AND COALESCE(SUM(fee_assignments.remaining_amount), 0) > 0",
                    'overdue' => "MAX(CASE WHEN fee_assignments.status = 'overdue' THEN 1 ELSE 0 END) = 1",
                    default => "1=1"
                });
            }

            // Get total count
            $countQuery = clone $query;
            $total = DB::table(DB::raw("({$countQuery->toSql()}) as sub"))
                ->mergeBindings($countQuery)
                ->count();

            // Get paginated results
            $students = $query
                ->orderBy('students.full_name')
                ->offset(($page - 1) * $perPage)
                ->limit($perPage)
                ->get();

            return response()->json([
                'data' => $students,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'last_page' => (int) ceil($total / $perPage),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('FeeReportController@studentFees error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching student fees'], 500);
        }
    }

    /**
     * Fee Collection Report - Detailed collection statistics
     */
    public function collectionReport(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('fees.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
                'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
            ]);

            $orgId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Payment collection over time (by month)
            $monthlyCollection = DB::table('fee_payments')
                ->whereNull('fee_payments.deleted_at')
                ->where('fee_payments.organization_id', $orgId)
                ->where('fee_payments.school_id', $currentSchoolId)
                ->when(!empty($validated['start_date']), fn($q) => $q->where('fee_payments.payment_date', '>=', $validated['start_date']))
                ->when(!empty($validated['end_date']), fn($q) => $q->where('fee_payments.payment_date', '<=', $validated['end_date']))
                ->selectRaw("
                    DATE_TRUNC('month', payment_date) as month,
                    COUNT(*) as payment_count,
                    COALESCE(SUM(amount), 0) as total_amount
                ")
                ->groupByRaw("DATE_TRUNC('month', payment_date)")
                ->orderBy('month', 'desc')
                ->limit(12)
                ->get();

            // Payment by method
            $byMethod = DB::table('fee_payments')
                ->whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->when(!empty($validated['start_date']), fn($q) => $q->where('payment_date', '>=', $validated['start_date']))
                ->when(!empty($validated['end_date']), fn($q) => $q->where('payment_date', '<=', $validated['end_date']))
                ->groupBy('payment_method')
                ->selectRaw('
                    payment_method,
                    COUNT(*) as payment_count,
                    COALESCE(SUM(amount), 0) as total_amount
                ')
                ->orderByDesc('total_amount')
                ->get();

            // Daily collection for current month
            $startOfMonth = date('Y-m-01');
            $endOfMonth = date('Y-m-t');

            $dailyCollection = DB::table('fee_payments')
                ->whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $currentSchoolId)
                ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
                ->selectRaw("
                    payment_date::date as date,
                    COUNT(*) as payment_count,
                    COALESCE(SUM(amount), 0) as total_amount
                ")
                ->groupBy('payment_date')
                ->orderBy('date')
                ->get();

            return response()->json([
                'monthly_collection' => $monthlyCollection,
                'by_method' => $byMethod,
                'daily_collection' => $dailyCollection,
            ]);
        } catch (\Exception $e) {
            \Log::error('FeeReportController@collectionReport error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while generating collection report'], 500);
        }
    }

    /**
     * Fee Defaulters Report - Students with overdue or pending fees
     */
    public function defaulters(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('fees.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
                'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
                'min_amount' => 'nullable|numeric|min:0',
            ]);

            $orgId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $defaulters = DB::table('fee_assignments')
                ->whereNull('fee_assignments.deleted_at')
                ->where('fee_assignments.organization_id', $orgId)
                ->where('fee_assignments.school_id', $currentSchoolId)
                ->whereIn('fee_assignments.status', ['pending', 'partial', 'overdue'])
                ->where('fee_assignments.remaining_amount', '>', 0)
                ->when(!empty($validated['academic_year_id']), fn($q) => $q->where('fee_assignments.academic_year_id', $validated['academic_year_id']))
                ->when(!empty($validated['class_academic_year_id']), fn($q) => $q->where('fee_assignments.class_academic_year_id', $validated['class_academic_year_id']))
                ->join('students', 'fee_assignments.student_id', '=', 'students.id')
                ->where('students.school_id', $currentSchoolId)
                ->leftJoin('class_academic_years', 'fee_assignments.class_academic_year_id', '=', 'class_academic_years.id')
                ->leftJoin('classes', 'class_academic_years.class_id', '=', 'classes.id')
                ->leftJoin('fee_structures', 'fee_assignments.fee_structure_id', '=', 'fee_structures.id')
                ->when(!empty($validated['min_amount']), fn($q) => $q->where('fee_assignments.remaining_amount', '>=', $validated['min_amount']))
                ->select([
                    'fee_assignments.id as assignment_id',
                    'students.id as student_id',
                    'students.full_name',
                    'students.father_name',
                    'students.admission_no as registration_number',
                    'students.guardian_phone as phone',
                    'classes.name as class_name',
                    'fee_structures.name as fee_structure_name',
                    'fee_assignments.assigned_amount',
                    'fee_assignments.paid_amount',
                    'fee_assignments.remaining_amount',
                    'fee_assignments.due_date',
                    'fee_assignments.status',
                ])
                ->orderBy('fee_assignments.remaining_amount', 'desc')
                ->get();

            // Summary
            $summary = [
                'total_defaulters' => $defaulters->unique('student_id')->count(),
                'total_assignments' => $defaulters->count(),
                'total_outstanding' => $defaulters->sum('remaining_amount'),
            ];

            return response()->json([
                'summary' => $summary,
                'defaulters' => $defaulters,
            ]);
        } catch (\Exception $e) {
            \Log::error('FeeReportController@defaulters error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching defaulters'], 500);
        }
    }
}
