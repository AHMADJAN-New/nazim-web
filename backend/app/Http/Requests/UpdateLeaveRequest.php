<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeaveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'class_id' => 'nullable|uuid|exists:classes,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'leave_type' => 'nullable|string|in:full_day,partial_day,time_bound',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'reason' => 'nullable|string|max:500',
            'approval_note' => 'nullable|string|max:500',
            'status' => 'nullable|string|in:pending,approved,rejected,cancelled',
        ];
    }
}
