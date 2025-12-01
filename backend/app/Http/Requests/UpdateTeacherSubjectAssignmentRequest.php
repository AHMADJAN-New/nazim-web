<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTeacherSubjectAssignmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Only allow updating: schedule_slot_ids, is_active, notes
            // teacher_id, class_academic_year_id, subject_id cannot be changed (would require delete + create)
            'schedule_slot_ids' => [
                'sometimes',
                'required',
                'array',
                'min:1',
            ],
            'schedule_slot_ids.*' => [
                'required',
                'uuid',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null
        $this->merge([
            'notes' => $this->notes ?: null,
        ]);
    }
}

