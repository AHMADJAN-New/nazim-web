<?php

namespace App\Http\Requests\ExamSeating;

use Illuminate\Foundation\Http\FormRequest;

class SyncExamSeatingAssignmentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'assignments' => 'required|array|min:1',
            'assignments.*.row_number' => 'required|integer|min:1',
            'assignments.*.column_number' => 'required|integer|min:1',
            'assignments.*.exam_student_id' => 'nullable|uuid|exists:exam_students,id',
            'assignments.*.is_locked' => 'sometimes|boolean',
            'assignments.*.is_disabled' => 'sometimes|boolean',
        ];
    }
}
