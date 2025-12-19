<?php

namespace App\Services\Certificates;

use App\Models\CertificateTemplate;
use App\Models\GraduationBatch;
use App\Models\GraduationBatchExam;
use App\Models\GraduationStudent;
use App\Models\IssuedCertificate;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class GraduationBatchService
{
    public function __construct(
        private readonly GraduationEligibilityService $eligibilityService,
        private readonly CertificateNumberService $certificateNumberService,
        private readonly CertificateRenderService $certificateRenderService,
        private readonly CertificateAuditService $auditService,
        private readonly DatabaseManager $db
    ) {
    }

    public function createBatch(array $payload, string $userId): GraduationBatch
    {
        // Get exam IDs - support both old single exam_id and new exam_ids array
        $examIds = $payload['exam_ids'] ?? ($payload['exam_id'] ? [$payload['exam_id']] : []);
        $examWeights = $payload['exam_weights'] ?? [];

        if (empty($examIds)) {
            throw new UnprocessableEntityHttpException('At least one exam is required.');
        }

        $batch = GraduationBatch::create([
            'organization_id' => $payload['organization_id'],
            'school_id' => $payload['school_id'],
            'academic_year_id' => $payload['academic_year_id'],
            'class_id' => $payload['class_id'],
            'exam_id' => $payload['exam_id'] ?? $examIds[0], // Keep for backward compatibility
            'graduation_type' => $payload['graduation_type'] ?? GraduationBatch::TYPE_FINAL_YEAR,
            'from_class_id' => $payload['from_class_id'] ?? null,
            'to_class_id' => $payload['to_class_id'] ?? null,
            'graduation_date' => $payload['graduation_date'],
            'min_attendance_percentage' => $payload['min_attendance_percentage'] ?? 75.0,
            'require_attendance' => $payload['require_attendance'] ?? true,
            'exclude_approved_leaves' => $payload['exclude_approved_leaves'] ?? true,
            'created_by' => $userId,
            'status' => GraduationBatch::STATUS_DRAFT,
        ]);

        // Attach multiple exams with weights
        foreach ($examIds as $index => $examId) {
            GraduationBatchExam::create([
                'batch_id' => $batch->id,
                'exam_id' => $examId,
                'weight_percentage' => $examWeights[$examId] ?? null,
                'is_required' => true,
                'display_order' => $index,
            ]);
        }

        $this->auditService->log($batch->organization_id, $batch->school_id, 'graduation_batch', $batch->id, 'create', [
            'payload' => $payload,
            'user_id' => $userId,
            'exam_ids' => $examIds,
        ]);

        return $batch->load('exams.examType');
    }

    public function generateStudents(string $batchId, string $organizationId, string $schoolId, string $userId): Collection
    {
        $batch = GraduationBatch::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->find($batchId);

        if (!$batch) {
            throw new NotFoundHttpException('Graduation batch not found.');
        }

        if ($batch->status !== GraduationBatch::STATUS_DRAFT) {
            throw new BadRequestHttpException('Cannot regenerate students once batch is approved or issued.');
        }

        // Get all exam IDs from batch
        $examIds = $batch->exams->pluck('exam_id')->toArray();
        $weights = $batch->exams->pluck('weight_percentage', 'exam_id')->toArray();

        // If no exams in pivot table, fall back to single exam_id (backward compatibility)
        if (empty($examIds) && $batch->exam_id) {
            $examIds = [$batch->exam_id];
            $weights = [];
        }

        if (empty($examIds)) {
            throw new UnprocessableEntityHttpException('No exams found for this batch.');
        }

        // Use multi-exam evaluation if available, otherwise single exam
        if (count($examIds) > 1 && method_exists($this->eligibilityService, 'evaluateMultiExam')) {
            $eligibility = $this->eligibilityService->evaluateMultiExam(
                $organizationId,
                $schoolId,
                $batch->academic_year_id,
                $batch->class_id,
                $examIds,
                $weights,
                $batch->min_attendance_percentage,
                $batch->exclude_approved_leaves
            );
        } else {
            // Fall back to single exam evaluation
            $eligibility = $this->eligibilityService->evaluate(
                $organizationId,
                $schoolId,
                $batch->academic_year_id,
                $batch->class_id,
                $examIds[0]
            );
        }

        return $this->db->transaction(function () use ($batch, $eligibility, $userId) {
            GraduationStudent::where('batch_id', $batch->id)->delete();

            $records = collect($eligibility['students'] ?? [])->map(function (array $studentData) use ($batch) {
                return GraduationStudent::create([
                    'batch_id' => $batch->id,
                    'student_id' => $studentData['student_id'],
                    'final_result_status' => $studentData['final_result_status'],
                    'position' => $studentData['position'] ?? null,
                    'remarks' => null,
                    'eligibility_json' => $studentData['eligibility_json'] ?? [],
                ]);
            });

            $this->auditService->log(
                $batch->organization_id,
                $batch->school_id,
                'graduation_batch',
                $batch->id,
                'generate_students',
                ['count' => $records->count(), 'user_id' => $userId]
            );

            return $records;
        });
    }

    public function approveBatch(string $batchId, string $organizationId, string $schoolId, string $userId): GraduationBatch
    {
        $batch = GraduationBatch::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->find($batchId);

        if (!$batch) {
            throw new NotFoundHttpException('Graduation batch not found.');
        }

        if ($batch->status !== GraduationBatch::STATUS_DRAFT) {
            throw new BadRequestHttpException('Batch has already been approved or issued.');
        }

        $batch->status = GraduationBatch::STATUS_APPROVED;
        $batch->approved_at = now();
        $batch->approved_by = $userId;
        $batch->save();

        $this->auditService->log(
            $batch->organization_id,
            $batch->school_id,
            'graduation_batch',
            $batch->id,
            'approve',
            ['user_id' => $userId]
        );

        return $batch->fresh();
    }

    public function issueCertificates(
        string $batchId,
        string $templateId,
        string $organizationId,
        string $schoolId,
        string $userId
    ): Collection {
        $batch = GraduationBatch::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->with('students')
            ->find($batchId);

        if (!$batch) {
            throw new NotFoundHttpException('Graduation batch not found.');
        }

        if ($batch->status !== GraduationBatch::STATUS_APPROVED) {
            throw new BadRequestHttpException('Batch must be approved before issuing certificates.');
        }

        $template = CertificateTemplate::where('organization_id', $organizationId)
            ->where(function ($query) use ($schoolId) {
                $query->whereNull('school_id')->orWhere('school_id', $schoolId);
            })
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->find($templateId);

        if (!$template) {
            throw new UnprocessableEntityHttpException('Template not found or inactive for this school.');
        }

        $passStudents = $batch->students->where('final_result_status', GraduationStudent::RESULT_PASS);

        if ($passStudents->isEmpty()) {
            throw new UnprocessableEntityHttpException('No eligible students found for issuing certificates.');
        }

        $issued = $this->db->transaction(function () use ($batch, $template, $passStudents, $userId) {
            $records = collect();

            foreach ($passStudents as $gradStudent) {
                $certificateNo = $this->certificateNumberService->generate(
                    $batch->organization_id,
                    $batch->school_id,
                    $template->type ?? 'graduation',
                    $batch->graduation_date
                );

                $verificationHash = hash('sha256', Str::uuid()->toString() . $gradStudent->student_id . microtime(true));
                $verifyUrl = url('/verify/certificate/' . $verificationHash);

                /** @var IssuedCertificate $certificate */
                $certificate = IssuedCertificate::create([
                    'organization_id' => $batch->organization_id,
                    'school_id' => $batch->school_id,
                    'template_id' => $template->id,
                    'batch_id' => $batch->id,
                    'student_id' => $gradStudent->student_id,
                    'certificate_no' => $certificateNo,
                    'verification_hash' => $verificationHash,
                    'qr_payload' => $verifyUrl,
                    'issued_by' => $userId,
                    'issued_at' => now(),
                ]);

                $pdfPath = $this->certificateRenderService->renderSingle($template, $certificate, [
                    'graduation_date' => $batch->graduation_date,
                    'class_id' => $batch->class_id,
                    'academic_year_id' => $batch->academic_year_id,
                    'verification_url' => $verifyUrl,
                ]);

                if ($pdfPath) {
                    $certificate->pdf_path = $pdfPath;
                    $certificate->save();
                }

                $records->push($certificate);

                $this->auditService->log(
                    $batch->organization_id,
                    $batch->school_id,
                    'issued_certificate',
                    $certificate->id,
                    'issue',
                    ['user_id' => $userId, 'batch_id' => $batch->id]
                );
            }

            $batch->status = GraduationBatch::STATUS_ISSUED;
            $batch->save();

            return $records;
        });

        return $issued;
    }
}
