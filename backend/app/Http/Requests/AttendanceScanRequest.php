<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceScanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'card_number' => 'required|string|max:100', // Can be card_number, admission_no, or student_code
            'status' => 'nullable|string|in:present,absent,late,excused,sick,leave',
            'note' => 'nullable|string',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'status' => $this->input('status', 'present'),
        ]);
    }
}
