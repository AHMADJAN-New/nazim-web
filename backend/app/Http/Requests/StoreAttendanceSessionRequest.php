<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttendanceSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'class_id' => 'nullable|uuid|exists:classes,id', // Keep for backward compatibility
            'class_ids' => 'nullable|array|min:1', // New: multiple classes
            'class_ids.*' => 'required|uuid|exists:classes,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'session_date' => 'required|date',
            'method' => 'required|string|in:manual,barcode',
            'status' => 'nullable|string|in:open,closed',
            'remarks' => 'nullable|string',
            'records' => 'nullable|array',
            'records.*.student_id' => 'required_with:records|uuid|exists:students,id',
            'records.*.status' => 'required_with:records|string|in:present,absent,late,excused,sick,leave',
            'records.*.note' => 'nullable|string',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'status' => $this->input('status', 'open'),
        ]);
    }
}
