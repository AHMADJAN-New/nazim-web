<?php

namespace App\Services;

use App\Models\ExamSubject;
use App\Models\ExamTime;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ExamSubjectScheduleService
{
    /**
     * Effective schedule: earliest exam_times slot, else exam_subjects.scheduled_at.
     */
    public function resolveScheduledAt(ExamSubject $examSubject): ?Carbon
    {
        $examTime = $this->getEarliestExamTime($examSubject);

        if ($examTime) {
            return $this->datetimeFromExamTime($examTime);
        }

        return $examSubject->scheduled_at;
    }

    /**
     * Copy earliest exam_times slot into exam_subjects.scheduled_at when slots exist.
     */
    public function syncExamSubject(string $examSubjectId): void
    {
        $examSubject = ExamSubject::query()
            ->whereNull('deleted_at')
            ->find($examSubjectId);

        if (! $examSubject) {
            return;
        }

        $examTime = ExamTime::query()
            ->where('exam_subject_id', $examSubjectId)
            ->whereNull('deleted_at')
            ->orderBy('date')
            ->orderBy('start_time')
            ->first();

        if (! $examTime) {
            $examSubject->scheduled_at = null;
            $examSubject->save();

            return;
        }

        $examSubject->scheduled_at = $this->datetimeFromExamTime($examTime);
        $examSubject->save();
    }

    /**
     * @param  array<int, string>  $examSubjectIds
     */
    public function syncExamSubjects(array $examSubjectIds): void
    {
        foreach (array_unique($examSubjectIds) as $examSubjectId) {
            $this->syncExamSubject($examSubjectId);
        }
    }

    public function syncExam(string $examId, string $organizationId, string $schoolId): void
    {
        $subjectIds = ExamSubject::query()
            ->where('exam_id', $examId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->pluck('id')
            ->all();

        $this->syncExamSubjects($subjectIds);
    }

    private function getEarliestExamTime(ExamSubject $examSubject): ?ExamTime
    {
        if ($examSubject->relationLoaded('examTimes')) {
            return $this->sortExamTimes($examSubject->examTimes)->first();
        }

        return ExamTime::query()
            ->where('exam_subject_id', $examSubject->id)
            ->whereNull('deleted_at')
            ->orderBy('date')
            ->orderBy('start_time')
            ->first();
    }

    /**
     * @param  Collection<int, ExamTime>  $examTimes
     * @return Collection<int, ExamTime>
     */
    private function sortExamTimes(Collection $examTimes): Collection
    {
        return $examTimes
            ->filter(fn (ExamTime $time) => $time->deleted_at === null)
            ->sortBy([
                fn (ExamTime $time) => $time->date?->format('Y-m-d') ?? '',
                fn (ExamTime $time) => substr((string) $time->start_time, 0, 5),
            ])
            ->values();
    }

    private function datetimeFromExamTime(ExamTime $examTime): Carbon
    {
        $date = $examTime->date instanceof Carbon
            ? $examTime->date->format('Y-m-d')
            : substr((string) $examTime->date, 0, 10);
        $start = substr((string) $examTime->start_time, 0, 5);

        return Carbon::parse("{$date} {$start}:00");
    }
}
