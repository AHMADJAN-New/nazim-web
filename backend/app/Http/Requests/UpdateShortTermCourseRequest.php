<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateShortTermCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'name_en' => ['nullable', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'name_ps' => ['nullable', 'string', 'max:255'],
            'name_fa' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:draft,open,closed,completed'],
            'fee_amount' => ['nullable', 'numeric', 'min:0'],
            'instructor_name' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'closed_at' => ['nullable', 'date'],
            'closed_by' => ['nullable', 'uuid'],
        ];
    }
}
