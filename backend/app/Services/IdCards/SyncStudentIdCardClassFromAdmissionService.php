<?php

namespace App\Services\IdCards;

use App\Models\StudentAdmission;
use App\Models\StudentIdCard;
use Illuminate\Support\Facades\Log;

class SyncStudentIdCardClassFromAdmissionService
{
    /**
     * After a student admission's class/section changes within the same academic year,
     * update linked regular-student ID cards and invalidate print state so cards must be reprinted.
     *
     * @return int Number of student_id_cards rows updated
     */
    public function syncAfterAdmissionClassChange(
        StudentAdmission $admission,
        ?string $academicYearIdBefore,
        ?string $classIdBefore,
        ?string $classAcademicYearIdBefore
    ): int {
        $admission->refresh();

        if ($academicYearIdBefore === null || (string) $academicYearIdBefore !== (string) $admission->academic_year_id) {
            return 0;
        }

        if (! $this->placementChanged($classIdBefore, $classAcademicYearIdBefore, $admission)) {
            return 0;
        }

        $cards = StudentIdCard::query()
            ->where('student_admission_id', $admission->id)
            ->where('academic_year_id', $admission->academic_year_id)
            ->whereNull('course_student_id')
            ->whereNull('deleted_at')
            ->get();

        $updated = 0;
        foreach ($cards as $card) {
            $card->class_id = $admission->class_id;
            $card->class_academic_year_id = $admission->class_academic_year_id;
            $card->is_printed = false;
            $card->printed_at = null;
            $card->printed_by = null;
            $card->save();
            $updated++;
        }

        if ($updated > 0) {
            Log::info('Synced ID card class from admission placement change', [
                'student_admission_id' => $admission->id,
                'student_id' => $admission->student_id,
                'academic_year_id' => $admission->academic_year_id,
                'cards_updated' => $updated,
            ]);
        }

        return $updated;
    }

    /**
     * Backfill student_id_cards whose class fields differ from the linked admission (same academic year).
     *
     * @return array{scanned:int, mismatched:int, updated:int}
     */
    public function backfillMisalignedCards(
        ?string $organizationId,
        ?string $schoolId,
        ?string $studentId,
        bool $dryRun,
        int $chunkSize = 200
    ): array {
        $scanned = 0;
        $mismatched = 0;
        $updated = 0;

        $query = StudentIdCard::query()
            ->with(['studentAdmission' => function ($q): void {
                $q->whereNull('deleted_at');
            }])
            ->whereNull('deleted_at')
            ->whereNull('course_student_id')
            ->whereNotNull('student_admission_id')
            ->orderBy('id');

        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }
        if ($schoolId) {
            $query->where('school_id', $schoolId);
        }
        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        $query->chunkById(max(50, $chunkSize), function ($cards) use (&$scanned, &$mismatched, &$updated, $dryRun): void {
            foreach ($cards as $card) {
                $scanned++;
                $admission = $card->studentAdmission;
                if (! $admission) {
                    continue;
                }

                if ((string) $card->academic_year_id !== (string) $admission->academic_year_id) {
                    continue;
                }

                if ($this->cardMatchesAdmission($card, $admission)) {
                    continue;
                }

                $mismatched++;

                if ($dryRun) {
                    continue;
                }

                $card->class_id = $admission->class_id;
                $card->class_academic_year_id = $admission->class_academic_year_id;
                $card->is_printed = false;
                $card->printed_at = null;
                $card->printed_by = null;
                $card->save();
                $updated++;
            }
        });

        return [
            'scanned' => $scanned,
            'mismatched' => $mismatched,
            'updated' => $updated,
        ];
    }

    private function placementChanged(
        ?string $classIdBefore,
        ?string $classAcademicYearIdBefore,
        StudentAdmission $after
    ): bool {
        return $this->norm($classIdBefore) !== $this->norm($after->class_id)
            || $this->norm($classAcademicYearIdBefore) !== $this->norm($after->class_academic_year_id);
    }

    private function cardMatchesAdmission(StudentIdCard $card, StudentAdmission $admission): bool
    {
        return $this->norm($card->class_id) === $this->norm($admission->class_id)
            && $this->norm($card->class_academic_year_id) === $this->norm($admission->class_academic_year_id);
    }

    private function norm(?string $v): string
    {
        if ($v === null || $v === '') {
            return '';
        }

        return (string) $v;
    }
}
