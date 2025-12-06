<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnrollFromMainRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'course_id' => ['required', 'uuid'],
            'main_student_ids' => ['required', 'array'],
            'main_student_ids.*' => ['uuid'],
            'registration_date' => ['required', 'date'],
            'fee_paid' => ['nullable', 'boolean'],
            'fee_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
