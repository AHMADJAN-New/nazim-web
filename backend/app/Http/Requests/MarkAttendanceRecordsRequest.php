<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarkAttendanceRecordsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'records' => 'required|array|min:1',
            'records.*.student_id' => 'required|uuid|exists:students,id',
            'records.*.status' => 'required|string|in:present,absent,late,excused,sick,leave',
            'records.*.note' => 'nullable|string',
        ];
    }
}
