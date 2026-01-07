<?php

namespace App\Http\Controllers;

use App\Services\StudentHistoryService;
use App\Services\Reports\ReportService;
use App\Services\Reports\ReportConfig;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentHistoryController extends Controller
{
    public function __construct(
        private StudentHistoryService $historyService,
        private ReportService $reportService
    ) {}

    /**
     * Get complete student history
     */
    public function index(Request $request, string $studentId): JsonResponse
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Validate student exists and belongs to organization
        $student = DB::table('students')
            ->where('id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Get filters from request
        $filters = [
            'date_from' => $request->get('date_from'),
            'date_to' => $request->get('date_to'),
        ];

        try {
            $history = $this->historyService->getStudentHistory(
                $studentId,
                $profile->organization_id,
                $currentSchoolId,
                $filters
            );

            return response()->json($history);
        } catch (\Exception $e) {
            Log::error("Error fetching student history: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch student history'], 500);
        }
    }

    /**
     * Get a specific section of student history (lazy loading)
     */
    public function section(Request $request, string $studentId, string $section): JsonResponse
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Validate student exists and belongs to organization
        $student = DB::table('students')
            ->where('id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Validate section name
        $validSections = ['admissions', 'attendance', 'exams', 'fees', 'library', 'idCards', 'courses', 'graduations'];
        if (!in_array($section, $validSections)) {
            return response()->json(['error' => 'Invalid section'], 400);
        }

        // Get filters from request
        $filters = [
            'date_from' => $request->get('date_from'),
            'date_to' => $request->get('date_to'),
        ];

        try {
            $sectionData = $this->historyService->getSection(
                $studentId,
                $profile->organization_id,
                $section,
                $filters
            );

            return response()->json($sectionData);
        } catch (\Exception $e) {
            Log::error("Error fetching student history section: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch section data'], 500);
        }
    }

    /**
     * Export student history as PDF
     */
    public function exportPdf(Request $request, string $studentId): JsonResponse
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Validate student exists and belongs to organization
        $student = DB::table('students')
            ->where('id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        try {
            // Get student history data
            $history = $this->historyService->getStudentHistory(
                $studentId,
                $profile->organization_id,
                $currentSchoolId
            );

            // Log the export action
            $this->historyService->logAccess($studentId, 'export_pdf', 'all');

            // Build report data
            $reportData = $this->buildPdfReportData($history);

            // Debug: Log data structure to verify sections are included
            if (config('app.debug')) {
                \Log::debug("Student History PDF Report Data", [
                    'has_student' => !empty($reportData['student']),
                    'has_summary' => !empty($reportData['summary']),
                    'has_sections' => !empty($reportData['sections']),
                    'sections_keys' => array_keys($reportData['sections'] ?? []),
                    'admissions_count' => count($reportData['sections']['admissions'] ?? []),
                    'attendance_has_data' => !empty($reportData['sections']['attendance']),
                    'exams_has_data' => !empty($reportData['sections']['exams']),
                    'fees_has_data' => !empty($reportData['sections']['fees']),
                    'library_count' => count($reportData['sections']['library'] ?? []),
                ]);
            }

            // Create report config
            // CRITICAL: Set template_name explicitly to use student-history.blade.php
            // This prevents auto-selection based on column count
            // NOTE: Template name must match the file name (student-history.blade.php)
            $config = ReportConfig::fromArray([
                'report_key' => 'student_lifetime_history',
                'report_type' => 'pdf',
                'branding_id' => $request->get('branding_id', $currentSchoolId),
                'title' => 'Student Lifetime History - ' . ($history['student']['fullName'] ?? 'Unknown'),
                'calendar_preference' => $request->get('calendar_preference', 'jalali'),
                'language' => $request->get('language', 'ps'),
                'template_name' => 'student-history', // Must match student-history.blade.php file name
            ]);

            // Generate report
            $reportRun = $this->reportService->generateReport(
                $config,
                $reportData,
                $profile->organization_id
            );

            return response()->json([
                'id' => $reportRun->id,
                'status' => $reportRun->status,
                'message' => 'Report generation started',
            ], 202);

        } catch (\Exception $e) {
            Log::error("Error exporting student history PDF: " . $e->getMessage());
            return response()->json(['error' => 'Failed to generate PDF report'], 500);
        }
    }

    /**
     * Export student history as Excel
     */
    public function exportExcel(Request $request, string $studentId): JsonResponse
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for students.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Validate student exists and belongs to organization
        $student = DB::table('students')
            ->where('id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        try {
            // Get student history data
            $history = $this->historyService->getStudentHistory(
                $studentId,
                $profile->organization_id,
                $currentSchoolId
            );

            // Log the export action
            $this->historyService->logAccess($studentId, 'export_excel', 'all');

            // Build report data
            $reportData = $this->buildExcelReportData($history);

            // Create report config
            $config = ReportConfig::fromArray([
                'report_key' => 'student_lifetime_history',
                'report_type' => 'excel',
                'branding_id' => $request->get('branding_id', $currentSchoolId),
                'title' => 'Student Lifetime History - ' . ($history['student']['fullName'] ?? 'Unknown'),
                'calendar_preference' => $request->get('calendar_preference', 'jalali'),
                'language' => $request->get('language', 'ps'),
            ]);

            // Generate report
            $reportRun = $this->reportService->generateReport(
                $config,
                $reportData,
                $profile->organization_id
            );

            return response()->json([
                'id' => $reportRun->id,
                'status' => $reportRun->status,
                'message' => 'Report generation started',
            ], 202);

        } catch (\Exception $e) {
            Log::error("Error exporting student history Excel: " . $e->getMessage());
            return response()->json(['error' => 'Failed to generate Excel report'], 500);
        }
    }

    /**
     * Build PDF report data from history
     * CRITICAL: This method prepares data for the student-history.blade.php template
     * The template expects specific structure: student, summary, sections, labels, etc.
     */
    public function buildPdfReportData(array $history): array
    {
        $student = $history['student'] ?? [];
        $summary = $history['summary'] ?? [];
        $sections = $history['sections'] ?? [];
        $metadata = $history['metadata'] ?? [];

        // Format student data for template (snake_case for Blade template)
        $studentData = [
            'full_name' => $student['fullName'] ?? '',
            'admission_no' => $student['admissionNumber'] ?? '',
            'father_name' => $student['fatherName'] ?? '',
            'current_class' => $student['currentClass']['name'] ?? '',
            'current_section' => $student['currentClass']['section'] ?? '',
            'current_academic_year' => $student['currentClass']['academicYear'] ?? '',
            'birth_date' => isset($student['dateOfBirth']) && $student['dateOfBirth'] ? \Carbon\Carbon::parse($student['dateOfBirth'])->format('Y-m-d') : '',
            'status' => $student['status'] ?? '',
            'phone' => $student['phone'] ?? '',
            'picture_path' => $student['picturePath'] ?? null,
            'school_name' => $student['schoolName'] ?? '',
            'organization_name' => $student['organizationName'] ?? '',
            'student_code' => $student['studentCode'] ?? '',
            'card_number' => $student['cardNumber'] ?? '',
            'gender' => $student['gender'] ?? '',
            'nationality' => $student['nationality'] ?? '',
            'preferred_language' => $student['preferredLanguage'] ?? '',
            'home_address' => $student['homeAddress'] ?? '',
            'previous_school' => $student['previousSchool'] ?? '',
            'guardian_name' => $student['guardianName'] ?? '',
            'guardian_relation' => $student['guardianRelation'] ?? '',
            'guardian_phone' => $student['guardianPhone'] ?? '',
            'emergency_contact_name' => $student['emergencyContactName'] ?? '',
            'emergency_contact_phone' => $student['emergencyContactPhone'] ?? '',
        ];

        // Format summary data for template
        $summaryData = [
            'academic_years' => $summary['totalAcademicYears'] ?? 0,
            'attendance_rate' => round($summary['attendanceRate'] ?? 0, 2),
            'exam_average' => round($summary['averageExamScore'] ?? 0, 2),
            'total_fees_paid' => $summary['totalFeesPaid'] ?? 0,
            'library_loans' => $summary['totalLibraryLoans'] ?? 0,
            'courses_completed' => $summary['totalCoursesCompleted'] ?? 0,
        ];

        // Format admissions section (convert camelCase to snake_case)
        $admissionsData = array_map(function ($admission) {
            return [
                'academic_year' => $admission['academicYear']['name'] ?? '',
                'class' => $admission['class']['name'] ?? '',
                'admission_date' => isset($admission['admissionDate']) && $admission['admissionDate'] ? \Carbon\Carbon::parse($admission['admissionDate'])->format('Y-m-d') : '',
                'enrollment_status' => $admission['enrollmentStatus'] ?? '',
                'enrollment_type' => $admission['enrollmentType'] ?? '',
                'residency_type' => $admission['residencyType']['name'] ?? '',
            ];
        }, $sections['admissions'] ?? []);

        // Format attendance section
        $attendanceSummary = $sections['attendance']['summary'] ?? [];
        $attendanceData = [
            'summary' => [
                'total_days' => $attendanceSummary['totalDays'] ?? 0,
                'present' => $attendanceSummary['present'] ?? 0,
                'absent' => $attendanceSummary['absent'] ?? 0,
                'late' => $attendanceSummary['late'] ?? 0,
                'rate' => round($attendanceSummary['rate'] ?? 0, 2),
            ],
            'monthly_breakdown' => array_map(function ($item) {
                return [
                    'month' => $item['month'] ?? '',
                    'present' => $item['present'] ?? 0,
                    'absent' => $item['absent'] ?? 0,
                    'late' => $item['late'] ?? 0,
                    'rate' => round($item['rate'] ?? 0, 2),
                ];
            }, $sections['attendance']['monthlyBreakdown'] ?? []),
        ];

        // Format exams section
        $examsSummary = $sections['exams']['summary'] ?? [];
        $examsData = [
            'summary' => [
                'total_exams' => $examsSummary['totalExams'] ?? 0,
                'average_percentage' => round($examsSummary['averagePercentage'] ?? 0, 2),
            ],
            'exams' => array_map(function ($exam) {
                $subjectResults = array_map(function ($result) {
                    return [
                        'subject_name' => $result['subjectName'] ?? '',
                        'marks_obtained' => $result['marksObtained'] ?? 0,
                        'max_marks' => $result['maxMarks'] ?? 0,
                        'percentage' => round($result['percentage'] ?? 0, 2),
                        'is_absent' => $result['isAbsent'] ?? false,
                    ];
                }, $exam['subjectResults'] ?? []);
                
                return [
                    'exam_name' => $exam['examName'] ?? '',
                    'class_name' => $exam['className'] ?? '',
                    'exam_date' => isset($exam['examStartDate']) && $exam['examStartDate'] ? \Carbon\Carbon::parse($exam['examStartDate'])->format('Y-m-d') : '',
                    'total_marks' => $exam['totalMarks'] ?? 0,
                    'max_marks' => $exam['maxMarks'] ?? 0,
                    'percentage' => round($exam['percentage'] ?? 0, 2),
                    'subject_results' => $subjectResults,
                ];
            }, $sections['exams']['exams'] ?? []),
        ];

        // Format fees section
        $feesSummary = $sections['fees']['summary'] ?? [];
        $feesData = [
            'summary' => [
                'total_assigned' => $feesSummary['totalAssigned'] ?? 0,
                'total_paid' => $feesSummary['totalPaid'] ?? 0,
                'total_remaining' => $feesSummary['totalRemaining'] ?? 0,
            ],
            'assignments' => array_map(function ($assignment) {
                $payments = array_map(function ($payment) {
                    return [
                        'payment_date' => isset($payment['paymentDate']) && $payment['paymentDate'] ? \Carbon\Carbon::parse($payment['paymentDate'])->format('Y-m-d') : '',
                        'amount' => $payment['amount'] ?? 0,
                        'payment_method' => $payment['paymentMethod'] ?? '',
                        'reference_no' => $payment['referenceNo'] ?? '',
                    ];
                }, $assignment['feePayments'] ?? []);
                
                return [
                    'fee_structure' => $assignment['feeStructure']['name'] ?? '',
                    'academic_year' => $assignment['academicYear']['name'] ?? '',
                    'assigned_amount' => $assignment['assignedAmount'] ?? 0,
                    'paid_amount' => $assignment['paidAmount'] ?? 0,
                    'remaining_amount' => $assignment['remainingAmount'] ?? 0,
                    'status' => $assignment['status'] ?? '',
                    'due_date' => isset($assignment['dueDate']) && $assignment['dueDate'] ? \Carbon\Carbon::parse($assignment['dueDate'])->format('Y-m-d') : '',
                    'payments' => $payments,
                ];
            }, $sections['fees']['assignments'] ?? []),
        ];

        // Format library section
        $libraryData = array_map(function ($loan) {
            return [
                'book_title' => $loan['book']['title'] ?? '',
                'author' => $loan['book']['author'] ?? '',
                'loan_date' => isset($loan['loanDate']) && $loan['loanDate'] ? \Carbon\Carbon::parse($loan['loanDate'])->format('Y-m-d') : '',
                'due_date' => isset($loan['dueDate']) && $loan['dueDate'] ? \Carbon\Carbon::parse($loan['dueDate'])->format('Y-m-d') : '',
                'return_date' => isset($loan['returnedAt']) && $loan['returnedAt'] ? \Carbon\Carbon::parse($loan['returnedAt'])->format('Y-m-d') : null,
                'status' => $loan['status'] ?? '',
            ];
        }, $sections['library']['loans'] ?? []);

        // Format ID cards section
        $idCardsData = array_map(function ($card) {
            return [
                'card_number' => $card['cardNumber'] ?? '',
                'academic_year' => $card['academicYear']['name'] ?? '',
                'class' => $card['class']['name'] ?? '',
                'issued_at' => isset($card['createdAt']) && $card['createdAt'] ? \Carbon\Carbon::parse($card['createdAt'])->format('Y-m-d') : '',
                'is_printed' => $card['isPrinted'] ?? false,
                'template' => $card['templateName'] ?? ($card['template']['name'] ?? ''),
                'fee_paid' => $card['feePaid'] ?? null,
            ];
        }, $sections['idCards'] ?? []);

        // Format courses section
        $coursesData = array_map(function ($course) {
            return [
                'course_name' => $course['course']['name'] ?? '',
                'registration_date' => isset($course['registrationDate']) && $course['registrationDate'] ? \Carbon\Carbon::parse($course['registrationDate'])->format('Y-m-d') : '',
                'status' => $course['completionStatus'] ?? '',
                'completion_date' => isset($course['completionDate']) && $course['completionDate'] ? \Carbon\Carbon::parse($course['completionDate'])->format('Y-m-d') : null,
                'grade' => $course['grade'] ?? '',
                'certificate_issued' => $course['certificateIssued'] ?? false,
            ];
        }, $sections['courses'] ?? []);

        // Format graduations section
        $graduationsData = array_map(function ($graduation) {
            return [
                'batch_name' => $graduation['batch']['name'] ?? '',
                'graduation_date' => isset($graduation['createdAt']) && $graduation['createdAt'] ? \Carbon\Carbon::parse($graduation['createdAt'])->format('Y-m-d') : '',
                'final_result' => $graduation['finalResultStatus'] ?? '',
                'certificate_number' => $graduation['certificateNumber'] ?? '',
            ];
        }, $sections['graduations'] ?? []);

        // Format sections data for template (all in snake_case)
        $sectionsData = [
            'admissions' => $admissionsData,
            'attendance' => $attendanceData,
            'exams' => $examsData,
            'fees' => $feesData,
            'library' => $libraryData,
            'id_cards' => $idCardsData,
            'courses' => $coursesData,
            'graduations' => $graduationsData,
        ];

        // Return data structure that matches the template expectations
        // Note: We still need columns/rows for the ReportService, but the template will use the sections data
        return [
            // For ReportService (required structure)
            'columns' => [
                ['key' => 'section', 'label' => 'Section'],
                ['key' => 'value', 'label' => 'Value'],
            ],
            'rows' => [
                ['section' => 'Student', 'value' => $studentData['full_name']],
                ['section' => 'Admission No', 'value' => $studentData['admission_no']],
            ],
            
            // For student-history.blade.php template (custom data)
            'student' => $studentData,
            'summary' => $summaryData,
            'sections' => $sectionsData,
            'metadata' => $metadata,
            'generatedAt' => $metadata['generatedAt'] ?? now()->toISOString(),
            
            // Labels for translations (will be set by ReportService based on language)
            'labels' => [], // Will be populated by template based on language context
        ];
    }

    /**
     * Build Excel report data from history
     */
    public function buildExcelReportData(array $history): array
    {
        $student = $history['student'] ?? [];
        $summary = $history['summary'] ?? [];
        $sections = $history['sections'] ?? [];

        // For Excel, we'll create multiple sheets worth of data
        // CRITICAL: ExcelReportService expects sheets under parameters.sheets
        return [
            'student' => $student,
            'summary' => $summary,
            'parameters' => [
                'sheets' => [
                'overview' => [
                    'sheet_name' => 'Overview',
                    'title' => 'Student Overview',
                    'columns' => [
                        ['key' => 'field', 'label' => 'Field'],
                        ['key' => 'value', 'label' => 'Value'],
                    ],
                    'rows' => [
                        ['field' => 'Full Name', 'value' => $student['fullName'] ?? ''],
                        ['field' => 'Admission Number', 'value' => $student['admissionNumber'] ?? ''],
                        ['field' => 'Father Name', 'value' => $student['fatherName'] ?? ''],
                        ['field' => 'Status', 'value' => $student['status'] ?? ''],
                        ['field' => 'Total Academic Years', 'value' => (string) ($summary['totalAcademicYears'] ?? 0)],
                        ['field' => 'Attendance Rate', 'value' => ($summary['attendanceRate'] ?? 0) . '%'],
                        ['field' => 'Average Exam Score', 'value' => ($summary['averageExamScore'] ?? 0) . '%'],
                        ['field' => 'Outstanding Fees', 'value' => (string) ($summary['outstandingFees'] ?? 0)],
                    ],
                ],
                'admissions' => [
                    'sheet_name' => 'Admissions',
                    'title' => 'Admission History',
                    'columns' => [
                        ['key' => 'admissionDate', 'label' => 'Admission Date'],
                        ['key' => 'class', 'label' => 'Class'],
                        ['key' => 'academicYear', 'label' => 'Academic Year'],
                        ['key' => 'status', 'label' => 'Status'],
                    ],
                    'rows' => array_map(function ($admission) {
                        return [
                            'admissionDate' => isset($admission['admissionDate']) && $admission['admissionDate'] ? \Carbon\Carbon::parse($admission['admissionDate'])->format('Y-m-d') : '',
                            'class' => $admission['class']['name'] ?? '',
                            'academicYear' => $admission['academicYear']['name'] ?? '',
                            'status' => $admission['enrollmentStatus'] ?? '',
                        ];
                    }, $sections['admissions'] ?? []),
                ],
                'exams' => [
                    'sheet_name' => 'Exams',
                    'title' => 'Exam Results',
                    'columns' => [
                        ['key' => 'examName', 'label' => 'Exam Name'],
                        ['key' => 'className', 'label' => 'Class'],
                        ['key' => 'totalMarks', 'label' => 'Marks Obtained'],
                        ['key' => 'maxMarks', 'label' => 'Max Marks'],
                        ['key' => 'percentage', 'label' => 'Percentage'],
                    ],
                    'rows' => array_map(function ($exam) {
                        return [
                            'examName' => $exam['examName'] ?? '',
                            'className' => $exam['className'] ?? '',
                            'totalMarks' => (string) ($exam['totalMarks'] ?? 0),
                            'maxMarks' => (string) ($exam['maxMarks'] ?? 0),
                            'percentage' => ($exam['percentage'] ?? 0) . '%',
                        ];
                    }, $sections['exams']['exams'] ?? []),
                ],
                'fees' => [
                    'sheet_name' => 'Fees',
                    'title' => 'Fee History',
                    'columns' => [
                        ['key' => 'feeStructure', 'label' => 'Fee Structure'],
                        ['key' => 'academicYear', 'label' => 'Academic Year'],
                        ['key' => 'assignedAmount', 'label' => 'Assigned'],
                        ['key' => 'paidAmount', 'label' => 'Paid'],
                        ['key' => 'remainingAmount', 'label' => 'Remaining'],
                        ['key' => 'status', 'label' => 'Status'],
                    ],
                    'rows' => array_map(function ($assignment) {
                        return [
                            'feeStructure' => $assignment['feeStructure']['name'] ?? '',
                            'academicYear' => $assignment['academicYear']['name'] ?? '',
                            'assignedAmount' => (string) ($assignment['assignedAmount'] ?? 0),
                            'paidAmount' => (string) ($assignment['paidAmount'] ?? 0),
                            'remainingAmount' => (string) ($assignment['remainingAmount'] ?? 0),
                            'status' => $assignment['status'] ?? '',
                        ];
                    }, $sections['fees']['assignments'] ?? []),
                ],
                'library' => [
                    'sheet_name' => 'Library',
                    'title' => 'Library Loans',
                    'columns' => [
                        ['key' => 'bookTitle', 'label' => 'Book Title'],
                        ['key' => 'author', 'label' => 'Author'],
                        ['key' => 'accessionNumber', 'label' => 'Accession #'],
                        ['key' => 'loanDate', 'label' => 'Loan Date'],
                        ['key' => 'dueDate', 'label' => 'Due Date'],
                        ['key' => 'returnedAt', 'label' => 'Returned'],
                        ['key' => 'status', 'label' => 'Status'],
                    ],
                    'rows' => array_map(function ($loan) {
                        return [
                            'bookTitle' => $loan['book']['title'] ?? '',
                            'author' => $loan['book']['author'] ?? '',
                            'accessionNumber' => $loan['book']['accessionNumber'] ?? '',
                            'loanDate' => isset($loan['loanDate']) && $loan['loanDate'] ? \Carbon\Carbon::parse($loan['loanDate'])->format('Y-m-d') : '',
                            'dueDate' => isset($loan['dueDate']) && $loan['dueDate'] ? \Carbon\Carbon::parse($loan['dueDate'])->format('Y-m-d') : '',
                            'returnedAt' => isset($loan['returnedAt']) && $loan['returnedAt'] ? \Carbon\Carbon::parse($loan['returnedAt'])->format('Y-m-d') : '',
                            'status' => $loan['status'] ?? '',
                        ];
                    }, $sections['library']['loans'] ?? []),
                ],
                'attendance' => [
                    'sheet_name' => 'Attendance',
                    'title' => 'Attendance Summary',
                    'columns' => [
                        ['key' => 'month', 'label' => 'Month'],
                        ['key' => 'present', 'label' => 'Present'],
                        ['key' => 'absent', 'label' => 'Absent'],
                        ['key' => 'late', 'label' => 'Late'],
                        ['key' => 'rate', 'label' => 'Rate (%)'],
                    ],
                    'rows' => array_map(function ($item) {
                        return [
                            'month' => $item['month'] ?? '',
                            'present' => (string) ($item['present'] ?? 0),
                            'absent' => (string) ($item['absent'] ?? 0),
                            'late' => (string) ($item['late'] ?? 0),
                            'rate' => round($item['rate'] ?? 0, 2) . '%',
                        ];
                    }, $sections['attendance']['monthlyBreakdown'] ?? []),
                ],
                'id_cards' => [
                    'sheet_name' => 'ID Cards',
                    'title' => 'ID Card History',
                    'columns' => [
                        ['key' => 'cardNumber', 'label' => 'Card Number'],
                        ['key' => 'template', 'label' => 'Template'],
                        ['key' => 'academicYear', 'label' => 'Academic Year'],
                        ['key' => 'class', 'label' => 'Class'],
                        ['key' => 'issueDate', 'label' => 'Issue Date'],
                        ['key' => 'isPrinted', 'label' => 'Printed'],
                        ['key' => 'feePaid', 'label' => 'Fee Paid'],
                    ],
                    'rows' => array_map(function ($card) {
                        return [
                            'cardNumber' => $card['cardNumber'] ?? '',
                            'template' => $card['template']['name'] ?? '',
                            'academicYear' => $card['academicYear']['name'] ?? '',
                            'class' => $card['class']['name'] ?? '',
                            'issueDate' => isset($card['createdAt']) && $card['createdAt'] ? \Carbon\Carbon::parse($card['createdAt'])->format('Y-m-d') : '',
                            'isPrinted' => $card['isPrinted'] ? 'Yes' : 'No',
                            'feePaid' => $card['feePaid'] ? 'Yes' : 'No',
                        ];
                    }, $sections['idCards'] ?? []),
                ],
                'courses' => [
                    'sheet_name' => 'Courses',
                    'title' => 'Short-Term Courses',
                    'columns' => [
                        ['key' => 'courseName', 'label' => 'Course Name'],
                        ['key' => 'registrationDate', 'label' => 'Registration Date'],
                        ['key' => 'completionDate', 'label' => 'Completion Date'],
                        ['key' => 'completionStatus', 'label' => 'Status'],
                        ['key' => 'grade', 'label' => 'Grade'],
                        ['key' => 'certificateIssued', 'label' => 'Certificate Issued'],
                    ],
                    'rows' => array_map(function ($course) {
                        return [
                            'courseName' => $course['course']['name'] ?? '',
                            'registrationDate' => isset($course['registrationDate']) && $course['registrationDate'] ? \Carbon\Carbon::parse($course['registrationDate'])->format('Y-m-d') : '',
                            'completionDate' => isset($course['completionDate']) && $course['completionDate'] ? \Carbon\Carbon::parse($course['completionDate'])->format('Y-m-d') : '',
                            'completionStatus' => $course['completionStatus'] ?? '',
                            'grade' => $course['grade'] ?? '',
                            'certificateIssued' => $course['certificateIssued'] ? 'Yes' : 'No',
                        ];
                    }, $sections['courses'] ?? []),
                ],
                'graduations' => [
                    'sheet_name' => 'Graduations',
                    'title' => 'Graduation Records',
                    'columns' => [
                        ['key' => 'batchName', 'label' => 'Batch Name'],
                        ['key' => 'graduationDate', 'label' => 'Graduation Date'],
                        ['key' => 'finalResult', 'label' => 'Final Result'],
                        ['key' => 'certificateNumber', 'label' => 'Certificate #'],
                    ],
                    'rows' => array_map(function ($graduation) {
                        return [
                            'batchName' => $graduation['batch']['name'] ?? '',
                            'graduationDate' => isset($graduation['createdAt']) && $graduation['createdAt'] ? \Carbon\Carbon::parse($graduation['createdAt'])->format('Y-m-d') : '',
                            'finalResult' => $graduation['finalResultStatus'] ?? '',
                            'certificateNumber' => $graduation['certificateNumber'] ?? '',
                        ];
                    }, $sections['graduations'] ?? []),
                ],
                ],
            ],
            'metadata' => $history['metadata'] ?? [],
        ];
    }

    /**
     * Preview the student history report template (for testing/development)
     * This route renders the template directly in the browser with sample data
     * 
     * Supports authentication via:
     * - Bearer token in Authorization header (standard)
     * - token query parameter (for easy browser testing in dev mode only)
     */
    public function previewTemplate(Request $request): \Illuminate\View\View
    {
        // Only allow in development mode
        if (!config('app.debug')) {
            abort(404);
        }

        // Get sample student ID from query or use first available student
        $studentId = $request->get('student_id');
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            abort(403, 'User must be assigned to an organization');
        }

        // Get current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // If no student_id provided, get first student
        if (!$studentId) {
            $student = DB::table('students')
                ->where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$student) {
                abort(404, 'No students found. Please provide a student_id parameter.');
            }
            $studentId = $student->id;
        }

        // Get student history data
        try {
            $history = $this->historyService->getStudentHistory(
                $studentId,
                $profile->organization_id,
                $currentSchoolId
            );
        } catch (\Exception $e) {
            abort(500, 'Failed to fetch student history: ' . $e->getMessage());
        }

        // Build report data
        $reportData = $this->buildPdfReportData($history);

        // Build context for template (similar to PdfReportService)
        $context = [
            'student' => $reportData['student'] ?? [],
            'summary' => $reportData['summary'] ?? [],
            'sections' => $reportData['sections'] ?? [],
            'metadata' => $reportData['metadata'] ?? [],
            'generatedAt' => now()->format('Y-m-d H:i'),
            'totalRecords' => $reportData['metadata']['totalRecords'] ?? 0,
            'labels' => [], // Will be populated by template based on language
            'TABLE_TITLE' => 'Student Lifetime History - Preview',
            'SCHOOL_NAME' => 'Test School',
            'PRIMARY_COLOR' => '#0b0b56',
            'SECONDARY_COLOR' => '#0056b3',
            'FONT_FAMILY' => 'Inter',
            'FONT_SIZE' => '12px',
            'rtl' => false,
            'show_page_numbers' => true,
        ];

        // Render the template directly
        return view('reports.student-history', $context);
    }

}

