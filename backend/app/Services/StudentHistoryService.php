<?php

namespace App\Services;

use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ExamStudent;
use App\Models\ExamResult;
use App\Models\FeeAssignment;
use App\Models\FeePayment;
use App\Models\LibraryLoan;
use App\Models\StudentIdCard;
use App\Models\CourseStudent;
use App\Models\GraduationStudent;
use App\Models\StudentHistoryAuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;
use Carbon\Carbon;

/**
 * Service for aggregating student lifetime history data
 */
class StudentHistoryService
{
    /**
     * Get complete student history
     *
     * @param string $studentId
     * @param string $organizationId
     * @param string|null $schoolId
     * @param array $filters
     * @return array
     */
    public function getStudentHistory(
        string $studentId,
        string $organizationId,
        ?string $schoolId = null,
        array $filters = []
    ): array {
        // Get basic student info
        $student = $this->getStudentBasicInfo($studentId, $organizationId);
        
        if (!$student) {
            return ['error' => 'Student not found'];
        }

        // Get all sections data
        $admissions = $this->getAdmissionsHistory($studentId, $organizationId);
        $attendance = $this->getAttendanceSummary($studentId, $organizationId, $filters);
        $exams = $this->getExamHistory($studentId, $organizationId);
        $fees = $this->getFeeHistory($studentId, $organizationId);
        $library = $this->getLibraryHistory($studentId, $organizationId);
        $idCards = $this->getIdCardHistory($studentId, $organizationId);
        $courses = $this->getCourseHistory($studentId, $organizationId);
        $graduations = $this->getGraduationHistory($studentId, $organizationId);

        // Build summary
        $summary = $this->buildSummary($student, $admissions, $attendance, $exams, $fees, $library);

        // Build timeline events
        $timeline = $this->buildTimeline($admissions, $attendance, $exams, $fees, $library, $idCards, $courses, $graduations);

        // Get academic years
        $academicYears = $this->getAcademicYears($admissions);

        // Log the access
        $this->logAccess($studentId, 'view', 'overview');

        return [
            'student' => $student,
            'summary' => $summary,
            'timeline' => $timeline,
            'sections' => [
                'admissions' => $admissions,
                'attendance' => $attendance,
                'exams' => $exams,
                'fees' => $fees,
                'library' => $library,
                'idCards' => $idCards,
                'courses' => $courses,
                'graduations' => $graduations,
            ],
            'metadata' => [
                'generatedAt' => now()->toISOString(),
                'academicYears' => $academicYears,
                'totalRecords' => $this->countTotalRecords($admissions, $attendance, $exams, $fees, $library, $idCards, $courses, $graduations),
            ],
        ];
    }

    /**
     * Get basic student information
     */
    public function getStudentBasicInfo(string $studentId, string $organizationId): ?array
    {
        $student = Student::where('id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['school', 'organization'])
            ->first();

        if (!$student) {
            return null;
        }

        // Get current admission
        $currentAdmission = StudentAdmission::where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['class', 'classAcademicYear', 'academicYear'])
            ->orderBy('admission_date', 'desc')
            ->first();

        return [
            'id' => $student->id,
            'admissionNumber' => $student->admission_no,
            'studentCode' => $student->student_code,
            'cardNumber' => $student->card_number,
            'fullName' => $student->full_name,
            'firstName' => explode(' ', $student->full_name)[0] ?? '',
            'lastName' => explode(' ', $student->full_name, 2)[1] ?? '',
            'fatherName' => $student->father_name,
            'grandfatherName' => $student->grandfather_name,
            'motherName' => $student->mother_name,
            'gender' => $student->gender,
            'dateOfBirth' => $student->birth_date?->toDateString(),
            'birthYear' => $student->birth_year,
            'birthDate' => $student->birth_date?->format('Y-m-d'),
            'age' => $student->age,
            'admissionYear' => $student->admission_year,
            'status' => $student->student_status,
            'picturePath' => $student->picture_path,
            'phone' => $student->guardian_phone,
            'email' => null,
            'schoolId' => $student->school_id,
            'schoolName' => $student->school?->school_name,
            'organizationId' => $student->organization_id,
            'organizationName' => $student->organization?->name,
            'currentClass' => $currentAdmission ? [
                'id' => $currentAdmission->class_id,
                'name' => $currentAdmission->class?->name,
                'section' => $currentAdmission->classAcademicYear?->section_name,
                'academicYear' => $currentAdmission->academicYear?->name,
            ] : null,
            'currentEnrollmentStatus' => $currentAdmission?->enrollment_status,
            'createdAt' => $student->created_at?->toISOString(),
            // Full registration data
            'homeAddress' => $student->home_address,
            'nationality' => $student->nationality,
            'preferredLanguage' => $student->preferred_language,
            'previousSchool' => $student->previous_school,
            'guardianName' => $student->guardian_name,
            'guardianRelation' => $student->guardian_relation,
            'guardianPhone' => $student->guardian_phone,
            'guardianTazkira' => $student->guardian_tazkira,
            'guardianPicturePath' => $student->guardian_picture_path,
            'zaminName' => $student->zamin_name,
            'zaminPhone' => $student->zamin_phone,
            'zaminTazkira' => $student->zamin_tazkira,
            'zaminAddress' => $student->zamin_address,
            'applyingGrade' => $student->applying_grade,
            'isOrphan' => $student->is_orphan,
            'admissionFeeStatus' => $student->admission_fee_status,
            'disabilityStatus' => $student->disability_status,
            'emergencyContactName' => $student->emergency_contact_name,
            'emergencyContactPhone' => $student->emergency_contact_phone,
            'familyIncome' => $student->family_income,
            'origProvince' => $student->orig_province,
            'origDistrict' => $student->orig_district,
            'origVillage' => $student->orig_village,
            'currProvince' => $student->curr_province,
            'currDistrict' => $student->curr_district,
            'currVillage' => $student->curr_village,
        ];
    }

    /**
     * Get admissions history
     */
    public function getAdmissionsHistory(string $studentId, string $organizationId): array
    {
        $admissions = StudentAdmission::where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['class', 'classAcademicYear', 'academicYear', 'residencyType', 'room', 'school'])
            ->orderBy('admission_date', 'desc')
            ->get();

        return $admissions->map(function ($admission) {
            return [
                'id' => $admission->id,
                'admissionDate' => $admission->admission_date?->toDateString(),
                'admissionYear' => $admission->admission_year,
                'enrollmentStatus' => $admission->enrollment_status,
                'enrollmentType' => $admission->enrollment_type,
                'shift' => $admission->shift,
                'isBoarder' => $admission->is_boarder,
                'feeStatus' => $admission->fee_status,
                'class' => $admission->class ? [
                    'id' => $admission->class->id,
                    'name' => $admission->class->name,
                    'gradeLevel' => $admission->class->grade_level,
                ] : null,
                'classAcademicYear' => $admission->classAcademicYear ? [
                    'id' => $admission->classAcademicYear->id,
                    'sectionName' => $admission->classAcademicYear->section_name,
                ] : null,
                'academicYear' => $admission->academicYear ? [
                    'id' => $admission->academicYear->id,
                    'name' => $admission->academicYear->name,
                    'startDate' => $admission->academicYear->start_date?->toDateString(),
                    'endDate' => $admission->academicYear->end_date?->toDateString(),
                ] : null,
                'residencyType' => $admission->residencyType ? [
                    'id' => $admission->residencyType->id,
                    'name' => $admission->residencyType->name,
                ] : null,
                'room' => $admission->room ? [
                    'id' => $admission->room->id,
                    'roomNumber' => $admission->room->room_number,
                ] : null,
                'school' => $admission->school ? [
                    'id' => $admission->school->id,
                    'name' => $admission->school->school_name,
                ] : null,
                'placementNotes' => $admission->placement_notes,
                'createdAt' => $admission->created_at?->toISOString(),
                'updatedAt' => $admission->updated_at?->toISOString(),
            ];
        })->toArray();
    }

    /**
     * Get attendance summary and records
     */
    public function getAttendanceSummary(string $studentId, string $organizationId, array $filters = []): array
    {
        $query = AttendanceRecord::where('attendance_records.student_id', $studentId)
            ->where('attendance_records.organization_id', $organizationId)
            ->whereNull('attendance_records.deleted_at')
            ->join('attendance_sessions', 'attendance_records.attendance_session_id', '=', 'attendance_sessions.id');

        // Apply date filters
        if (!empty($filters['date_from'])) {
            $query->where('attendance_sessions.session_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('attendance_sessions.session_date', '<=', $filters['date_to']);
        }

        // Get summary statistics
        $summary = DB::table('attendance_records')
            ->join('attendance_sessions', 'attendance_records.attendance_session_id', '=', 'attendance_sessions.id')
            ->where('attendance_records.student_id', $studentId)
            ->where('attendance_records.organization_id', $organizationId)
            ->whereNull('attendance_records.deleted_at')
            ->selectRaw("
                COUNT(*) as total_records,
                SUM(CASE WHEN attendance_records.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN attendance_records.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN attendance_records.status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN attendance_records.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
                SUM(CASE WHEN attendance_records.status = 'sick' THEN 1 ELSE 0 END) as sick_count,
                SUM(CASE WHEN attendance_records.status = 'leave' THEN 1 ELSE 0 END) as leave_count,
                MIN(attendance_sessions.session_date) as first_record_date,
                MAX(attendance_sessions.session_date) as last_record_date
            ")
            ->first();

        // Calculate attendance rate
        $totalRecords = $summary->total_records ?? 0;
        $presentCount = ($summary->present_count ?? 0) + ($summary->late_count ?? 0);
        $attendanceRate = $totalRecords > 0 ? round(($presentCount / $totalRecords) * 100, 2) : 0;

        // Get monthly breakdown
        $monthlyBreakdown = DB::table('attendance_records')
            ->join('attendance_sessions', 'attendance_records.attendance_session_id', '=', 'attendance_sessions.id')
            ->where('attendance_records.student_id', $studentId)
            ->where('attendance_records.organization_id', $organizationId)
            ->whereNull('attendance_records.deleted_at')
            ->selectRaw("
                TO_CHAR(attendance_sessions.session_date, 'YYYY-MM') as month,
                COUNT(*) as total,
                SUM(CASE WHEN attendance_records.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN attendance_records.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN attendance_records.status = 'late' THEN 1 ELSE 0 END) as late
            ")
            ->groupBy(DB::raw("TO_CHAR(attendance_sessions.session_date, 'YYYY-MM')"))
            ->orderBy('month', 'desc')
            ->limit(24) // Last 2 years
            ->get();

        // Get recent records (last 30 days)
        $recentRecords = AttendanceRecord::where('attendance_records.student_id', $studentId)
            ->where('attendance_records.organization_id', $organizationId)
            ->whereNull('attendance_records.deleted_at')
            ->join('attendance_sessions', 'attendance_records.attendance_session_id', '=', 'attendance_sessions.id')
            ->where('attendance_sessions.session_date', '>=', now()->subDays(30))
            ->select([
                'attendance_records.id',
                'attendance_records.status',
                'attendance_records.note',
                'attendance_records.marked_at',
                'attendance_sessions.session_date',
                'attendance_sessions.class_id',
            ])
            ->orderBy('attendance_sessions.session_date', 'desc')
            ->limit(50)
            ->get();

        return [
            'summary' => [
                'totalRecords' => $totalRecords,
                'presentCount' => $summary->present_count ?? 0,
                'absentCount' => $summary->absent_count ?? 0,
                'lateCount' => $summary->late_count ?? 0,
                'excusedCount' => $summary->excused_count ?? 0,
                'sickCount' => $summary->sick_count ?? 0,
                'leaveCount' => $summary->leave_count ?? 0,
                'attendanceRate' => $attendanceRate,
                'firstRecordDate' => $summary->first_record_date,
                'lastRecordDate' => $summary->last_record_date,
            ],
            'monthlyBreakdown' => $monthlyBreakdown->map(function ($item) {
                return [
                    'month' => $item->month,
                    'total' => (int) $item->total,
                    'present' => (int) $item->present,
                    'absent' => (int) $item->absent,
                    'late' => (int) $item->late,
                    'rate' => $item->total > 0 ? round((($item->present + $item->late) / $item->total) * 100, 2) : 0,
                ];
            })->toArray(),
            'recentRecords' => $recentRecords->map(function ($record) {
                return [
                    'id' => $record->id,
                    'date' => $record->session_date,
                    'status' => $record->status,
                    'note' => $record->note,
                    'markedAt' => $record->marked_at,
                ];
            })->toArray(),
        ];
    }

    /**
     * Get exam history
     */
    public function getExamHistory(string $studentId, string $organizationId): array
    {
        // Get student admissions first to find related exam students
        $admissionIds = StudentAdmission::where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->pluck('id');

        if ($admissionIds->isEmpty()) {
            return ['summary' => [], 'exams' => [], 'results' => []];
        }

        // Get exam students
        $examStudents = ExamStudent::whereIn('student_admission_id', $admissionIds)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['exam', 'examClass.classAcademicYear.class', 'examResults.examSubject.subject'])
            ->get();

        // Calculate summary
        $totalExams = $examStudents->count();
        $totalMarks = 0;
        $totalMaxMarks = 0;
        $examCount = 0;

        $examsData = $examStudents->map(function ($examStudent) use (&$totalMarks, &$totalMaxMarks, &$examCount) {
            $results = $examStudent->examResults;
            $examMarks = 0;
            $examMaxMarks = 0;

            $subjectResults = $results->map(function ($result) use (&$examMarks, &$examMaxMarks) {
                $maxMarks = $result->examSubject?->total_marks ?? 100;
                $examMarks += $result->marks_obtained ?? 0;
                $examMaxMarks += $maxMarks;

                return [
                    'id' => $result->id,
                    'subjectName' => $result->examSubject?->subject?->name ?? 'Unknown',
                    'marksObtained' => $result->marks_obtained,
                    'maxMarks' => $maxMarks,
                    'isAbsent' => $result->is_absent,
                    'percentage' => $maxMarks > 0 ? round(($result->marks_obtained / $maxMarks) * 100, 2) : 0,
                    'remarks' => $result->remarks,
                ];
            })->toArray();

            if ($examMaxMarks > 0) {
                $totalMarks += $examMarks;
                $totalMaxMarks += $examMaxMarks;
                $examCount++;
            }

            return [
                'id' => $examStudent->id,
                'examId' => $examStudent->exam_id,
                'examName' => $examStudent->exam?->name,
                'examRollNumber' => $examStudent->exam_roll_number,
                'examSecretNumber' => $examStudent->exam_secret_number,
                'className' => $examStudent->examClass?->classAcademicYear?->class?->name,
                'examStatus' => $examStudent->exam?->status,
                'examStartDate' => $examStudent->exam?->start_date?->toDateString(),
                'examEndDate' => $examStudent->exam?->end_date?->toDateString(),
                'totalMarks' => $examMarks,
                'maxMarks' => $examMaxMarks,
                'percentage' => $examMaxMarks > 0 ? round(($examMarks / $examMaxMarks) * 100, 2) : 0,
                'subjectResults' => $subjectResults,
            ];
        })->toArray();

        $averagePercentage = $totalMaxMarks > 0 ? round(($totalMarks / $totalMaxMarks) * 100, 2) : 0;

        return [
            'summary' => [
                'totalExams' => $totalExams,
                'totalMarks' => $totalMarks,
                'totalMaxMarks' => $totalMaxMarks,
                'averagePercentage' => $averagePercentage,
            ],
            'exams' => $examsData,
        ];
    }

    /**
     * Get fee history
     */
    public function getFeeHistory(string $studentId, string $organizationId): array
    {
        // Get fee assignments
        $assignments = FeeAssignment::where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['feeStructure', 'academicYear', 'feePayments', 'currency'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Calculate summary
        $totalAssigned = $assignments->sum('assigned_amount');
        $totalPaid = $assignments->sum('paid_amount');
        $totalRemaining = $assignments->sum('remaining_amount');
        $totalDiscount = $assignments->sum('exception_amount');

        // Get all payments
        $payments = FeePayment::where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['feeAssignment.feeStructure', 'currency', 'receivedBy'])
            ->orderBy('payment_date', 'desc')
            ->get();

        return [
            'summary' => [
                'totalAssigned' => (float) $totalAssigned,
                'totalPaid' => (float) $totalPaid,
                'totalRemaining' => (float) $totalRemaining,
                'totalDiscount' => (float) $totalDiscount,
                'paymentProgress' => $totalAssigned > 0 ? round(($totalPaid / $totalAssigned) * 100, 2) : 0,
            ],
            'assignments' => $assignments->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'feeStructure' => $assignment->feeStructure ? [
                        'id' => $assignment->feeStructure->id,
                        'name' => $assignment->feeStructure->name,
                    ] : null,
                    'academicYear' => $assignment->academicYear ? [
                        'id' => $assignment->academicYear->id,
                        'name' => $assignment->academicYear->name,
                    ] : null,
                    'originalAmount' => (float) $assignment->original_amount,
                    'assignedAmount' => (float) $assignment->assigned_amount,
                    'paidAmount' => (float) $assignment->paid_amount,
                    'remainingAmount' => (float) $assignment->remaining_amount,
                    'exceptionType' => $assignment->exception_type,
                    'exceptionAmount' => (float) $assignment->exception_amount,
                    'exceptionReason' => $assignment->exception_reason,
                    'dueDate' => $assignment->due_date?->toDateString(),
                    'status' => $assignment->status,
                    'currency' => $assignment->currency?->code,
                    'createdAt' => $assignment->created_at?->toISOString(),
                ];
            })->toArray(),
            'payments' => $payments->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'amount' => (float) $payment->amount,
                    'paymentDate' => $payment->payment_date?->toDateString(),
                    'paymentMethod' => $payment->payment_method,
                    'referenceNo' => $payment->reference_no,
                    'feeStructureName' => $payment->feeAssignment?->feeStructure?->name,
                    'currency' => $payment->currency?->code,
                    'receivedBy' => $payment->receivedBy?->full_name,
                    'notes' => $payment->notes,
                    'createdAt' => $payment->created_at?->toISOString(),
                ];
            })->toArray(),
        ];
    }

    /**
     * Get library history
     */
    public function getLibraryHistory(string $studentId, string $organizationId): array
    {
        $loans = LibraryLoan::where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['book', 'copy'])
            ->orderBy('loan_date', 'desc')
            ->get();

        // Calculate summary
        $totalLoans = $loans->count();
        $returnedLoans = $loans->whereNotNull('returned_at')->count();
        $currentLoans = $loans->whereNull('returned_at')->count();
        $overdueLoans = $loans->whereNull('returned_at')
            ->filter(function ($loan) {
                return $loan->due_date && Carbon::parse($loan->due_date)->isPast();
            })->count();

        return [
            'summary' => [
                'totalLoans' => $totalLoans,
                'returnedLoans' => $returnedLoans,
                'currentLoans' => $currentLoans,
                'overdueLoans' => $overdueLoans,
                'returnRate' => $totalLoans > 0 ? round(($returnedLoans / $totalLoans) * 100, 2) : 0,
            ],
            'loans' => $loans->map(function ($loan) {
                $isOverdue = $loan->due_date && !$loan->returned_at && Carbon::parse($loan->due_date)->isPast();
                
                return [
                    'id' => $loan->id,
                    'book' => $loan->book ? [
                        'id' => $loan->book->id,
                        'title' => $loan->book->title,
                        'author' => $loan->book->author,
                        'isbn' => $loan->book->isbn,
                    ] : null,
                    'copyCode' => $loan->copy?->copy_code,
                    'loanDate' => $loan->loan_date?->toDateString(),
                    'dueDate' => $loan->due_date?->toDateString(),
                    'returnedAt' => $loan->returned_at?->toDateString(),
                    'depositAmount' => (float) $loan->deposit_amount,
                    'feeRetained' => (float) $loan->fee_retained,
                    'refunded' => $loan->refunded,
                    'isOverdue' => $isOverdue,
                    'status' => $loan->returned_at ? 'returned' : ($isOverdue ? 'overdue' : 'active'),
                    'notes' => $loan->notes,
                ];
            })->toArray(),
        ];
    }

    /**
     * Get ID card history
     */
    public function getIdCardHistory(string $studentId, string $organizationId): array
    {
        $idCards = StudentIdCard::where('student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['template', 'academicYear', 'class', 'printedBy'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Calculate summary
        $totalCards = $idCards->count();
        $printedCards = $idCards->where('is_printed', true)->count();
        $feePaidCards = $idCards->where('card_fee_paid', true)->count();

        return [
            'summary' => [
                'totalCards' => $totalCards,
                'printedCards' => $printedCards,
                'unprintedCards' => $totalCards - $printedCards,
                'feePaidCards' => $feePaidCards,
                'feeUnpaidCards' => $totalCards - $feePaidCards,
            ],
            'cards' => $idCards->map(function ($card) {
                return [
                    'id' => $card->id,
                    'cardNumber' => $card->card_number,
                    'template' => $card->template ? [
                        'id' => $card->template->id,
                        'name' => $card->template->name,
                    ] : null,
                    'academicYear' => $card->academicYear ? [
                        'id' => $card->academicYear->id,
                        'name' => $card->academicYear->name,
                    ] : null,
                    'class' => $card->class ? [
                        'id' => $card->class->id,
                        'name' => $card->class->name,
                    ] : null,
                    'cardFee' => (float) $card->card_fee,
                    'cardFeePaid' => $card->card_fee_paid,
                    'cardFeePaidDate' => $card->card_fee_paid_date?->toDateString(),
                    'isPrinted' => $card->is_printed,
                    'printedAt' => $card->printed_at?->toDateString(),
                    'printedBy' => $card->printedBy?->full_name,
                    'notes' => $card->notes,
                    'createdAt' => $card->created_at?->toISOString(),
                ];
            })->toArray(),
        ];
    }

    /**
     * Get course history (short-term courses)
     */
    public function getCourseHistory(string $studentId, string $organizationId): array
    {
        $courses = CourseStudent::where('main_student_id', $studentId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->with(['course'])
            ->orderBy('registration_date', 'desc')
            ->get();

        // Calculate summary
        $totalCourses = $courses->count();
        $completedCourses = $courses->where('completion_status', 'completed')->count();
        $enrolledCourses = $courses->where('completion_status', 'enrolled')->count();
        $droppedCourses = $courses->where('completion_status', 'dropped')->count();
        $certificatesIssued = $courses->where('certificate_issued', true)->count();

        return [
            'summary' => [
                'totalCourses' => $totalCourses,
                'completedCourses' => $completedCourses,
                'enrolledCourses' => $enrolledCourses,
                'droppedCourses' => $droppedCourses,
                'certificatesIssued' => $certificatesIssued,
                'completionRate' => $totalCourses > 0 ? round(($completedCourses / $totalCourses) * 100, 2) : 0,
            ],
            'courses' => $courses->map(function ($course) {
                return [
                    'id' => $course->id,
                    'course' => $course->course ? [
                        'id' => $course->course->id,
                        'name' => $course->course->name,
                        'code' => $course->course->code,
                        'description' => $course->course->description,
                    ] : null,
                    'admissionNo' => $course->admission_no,
                    'registrationDate' => $course->registration_date?->toDateString(),
                    'completionStatus' => $course->completion_status,
                    'completionDate' => $course->completion_date?->toDateString(),
                    'grade' => $course->grade,
                    'certificateIssued' => $course->certificate_issued,
                    'certificateIssuedDate' => $course->certificate_issued_date?->toDateString(),
                    'certificateNumber' => $course->certificate_number,
                    'feePaid' => $course->fee_paid,
                    'feePaidDate' => $course->fee_paid_date?->toDateString(),
                    'feeAmount' => (float) $course->fee_amount,
                    'createdAt' => $course->created_at?->toISOString(),
                ];
            })->toArray(),
        ];
    }

    /**
     * Get graduation history
     */
    public function getGraduationHistory(string $studentId, string $organizationId): array
    {
        $graduations = GraduationStudent::where('student_id', $studentId)
            ->whereHas('batch', function ($query) use ($organizationId) {
                $query->where('organization_id', $organizationId);
            })
            ->with(['batch.academicYear', 'batch.classModel'])
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'summary' => [
                'totalGraduations' => $graduations->count(),
                'passed' => $graduations->where('final_result_status', 'pass')->count(),
                'failed' => $graduations->where('final_result_status', 'fail')->count(),
                'conditional' => $graduations->where('final_result_status', 'conditional')->count(),
            ],
            'graduations' => $graduations->map(function ($graduation) {
                return [
                    'id' => $graduation->id,
                    'batch' => $graduation->batch ? [
                        'id' => $graduation->batch->id,
                        'name' => $graduation->batch->name,
                        'graduationDate' => $graduation->batch->graduation_date?->toDateString(),
                        'academicYear' => $graduation->batch->academicYear?->name,
                        'class' => $graduation->batch->classModel?->name,
                    ] : null,
                    'finalResultStatus' => $graduation->final_result_status,
                    'position' => $graduation->position,
                    'remarks' => $graduation->remarks,
                    'eligibilityJson' => $graduation->eligibility_json,
                    'createdAt' => $graduation->created_at?->toISOString(),
                ];
            })->toArray(),
        ];
    }

    /**
     * Build summary from all sections
     */
    private function buildSummary(
        array $student,
        array $admissions,
        array $attendance,
        array $exams,
        array $fees,
        array $library
    ): array {
        // Count unique academic years from admissions
        $academicYearIds = collect($admissions)->pluck('academicYear.id')->filter()->unique();

        return [
            'totalAcademicYears' => $academicYearIds->count(),
            'currentClass' => $student['currentClass'],
            'currentStatus' => $student['currentEnrollmentStatus'] ?? $student['status'],
            'attendanceRate' => $attendance['summary']['attendanceRate'] ?? 0,
            'averageExamScore' => $exams['summary']['averagePercentage'] ?? 0,
            'outstandingFees' => $fees['summary']['totalRemaining'] ?? 0,
            'currentLibraryBooks' => $library['summary']['currentLoans'] ?? 0,
            'totalAdmissions' => count($admissions),
            'totalExams' => $exams['summary']['totalExams'] ?? 0,
            'totalFeePayments' => count($fees['payments'] ?? []),
            'totalLibraryLoans' => $library['summary']['totalLoans'] ?? 0,
        ];
    }

    /**
     * Build timeline events from all sections
     */
    private function buildTimeline(
        array $admissions,
        array $attendance,
        array $exams,
        array $fees,
        array $library,
        array $idCards,
        array $courses,
        array $graduations
    ): array {
        $events = [];

        // Add admission events
        foreach ($admissions as $admission) {
            $events[] = [
                'id' => 'admission-' . $admission['id'],
                'type' => 'admission',
                'date' => $admission['admissionDate'],
                'title' => 'Enrolled in ' . ($admission['class']['name'] ?? 'Class'),
                'description' => 'Academic Year: ' . ($admission['academicYear']['name'] ?? 'N/A'),
                'status' => $admission['enrollmentStatus'],
                'data' => $admission,
            ];
        }

        // Add exam events
        foreach ($exams['exams'] ?? [] as $exam) {
            $events[] = [
                'id' => 'exam-' . $exam['id'],
                'type' => 'exam',
                'date' => $exam['examStartDate'],
                'title' => $exam['examName'] ?? 'Exam',
                'description' => 'Score: ' . $exam['percentage'] . '%',
                'status' => $exam['examStatus'],
                'data' => $exam,
            ];
        }

        // Add fee payment events
        foreach ($fees['payments'] ?? [] as $payment) {
            $events[] = [
                'id' => 'payment-' . $payment['id'],
                'type' => 'fee_payment',
                'date' => $payment['paymentDate'],
                'title' => 'Fee Payment: ' . ($payment['feeStructureName'] ?? 'Fee'),
                'description' => 'Amount: ' . $payment['amount'] . ' ' . ($payment['currency'] ?? ''),
                'status' => 'paid',
                'data' => $payment,
            ];
        }

        // Add library loan events
        foreach ($library['loans'] ?? [] as $loan) {
            $events[] = [
                'id' => 'loan-' . $loan['id'],
                'type' => 'library_loan',
                'date' => $loan['loanDate'],
                'title' => 'Borrowed: ' . ($loan['book']['title'] ?? 'Book'),
                'description' => $loan['returnedAt'] ? 'Returned: ' . $loan['returnedAt'] : 'Due: ' . $loan['dueDate'],
                'status' => $loan['status'],
                'data' => $loan,
            ];
        }

        // Add ID card events
        foreach ($idCards['cards'] ?? [] as $card) {
            $events[] = [
                'id' => 'idcard-' . $card['id'],
                'type' => 'id_card',
                'date' => substr($card['createdAt'], 0, 10),
                'title' => 'ID Card Issued: ' . ($card['cardNumber'] ?? 'N/A'),
                'description' => 'Academic Year: ' . ($card['academicYear']['name'] ?? 'N/A'),
                'status' => $card['isPrinted'] ? 'printed' : 'pending',
                'data' => $card,
            ];
        }

        // Add course events
        foreach ($courses['courses'] ?? [] as $course) {
            $events[] = [
                'id' => 'course-' . $course['id'],
                'type' => 'course',
                'date' => $course['registrationDate'],
                'title' => 'Course: ' . ($course['course']['name'] ?? 'Course'),
                'description' => 'Status: ' . $course['completionStatus'],
                'status' => $course['completionStatus'],
                'data' => $course,
            ];
        }

        // Add graduation events
        foreach ($graduations['graduations'] ?? [] as $graduation) {
            $events[] = [
                'id' => 'graduation-' . $graduation['id'],
                'type' => 'graduation',
                'date' => $graduation['batch']['graduationDate'] ?? substr($graduation['createdAt'], 0, 10),
                'title' => 'Graduation: ' . ($graduation['batch']['name'] ?? 'Batch'),
                'description' => 'Result: ' . ($graduation['finalResultStatus'] ?? 'N/A'),
                'status' => $graduation['finalResultStatus'],
                'data' => $graduation,
            ];
        }

        // Sort by date descending
        usort($events, function ($a, $b) {
            return strcmp($b['date'] ?? '', $a['date'] ?? '');
        });

        return $events;
    }

    /**
     * Get unique academic years from admissions
     */
    private function getAcademicYears(array $admissions): array
    {
        return collect($admissions)
            ->pluck('academicYear')
            ->filter()
            ->unique('id')
            ->values()
            ->toArray();
    }

    /**
     * Count total records across all sections
     */
    private function countTotalRecords(
        array $admissions,
        array $attendance,
        array $exams,
        array $fees,
        array $library,
        array $idCards,
        array $courses,
        array $graduations
    ): int {
        return count($admissions)
            + ($attendance['summary']['totalRecords'] ?? 0)
            + count($exams['exams'] ?? [])
            + count($fees['assignments'] ?? [])
            + count($fees['payments'] ?? [])
            + count($library['loans'] ?? [])
            + count($idCards['cards'] ?? [])
            + count($courses['courses'] ?? [])
            + count($graduations['graduations'] ?? []);
    }

    /**
     * Log access to student history
     */
    public function logAccess(string $studentId, string $action, string $section): void
    {
        try {
            // Jobs (async report generation) run without an authenticated user.
            // Skip audit logging in that case to avoid DB NOT NULL violation on user_id.
            $userId = Auth::id();
            if (!$userId) {
                return;
            }

            StudentHistoryAuditLog::create([
                'student_id' => $studentId,
                'user_id' => $userId,
                'action' => $action,
                'section' => $section,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the request
            \Log::warning('Failed to log student history access: ' . $e->getMessage());
        }
    }

    /**
     * Get section-specific data (for lazy loading)
     */
    public function getSection(string $studentId, string $organizationId, string $section, array $filters = []): array
    {
        $this->logAccess($studentId, 'view', $section);

        return match ($section) {
            'admissions' => $this->getAdmissionsHistory($studentId, $organizationId),
            'attendance' => $this->getAttendanceSummary($studentId, $organizationId, $filters),
            'exams' => $this->getExamHistory($studentId, $organizationId),
            'fees' => $this->getFeeHistory($studentId, $organizationId),
            'library' => $this->getLibraryHistory($studentId, $organizationId),
            'idCards' => $this->getIdCardHistory($studentId, $organizationId),
            'courses' => $this->getCourseHistory($studentId, $organizationId),
            'graduations' => $this->getGraduationHistory($studentId, $organizationId),
            default => ['error' => 'Unknown section'],
        };
    }
}

