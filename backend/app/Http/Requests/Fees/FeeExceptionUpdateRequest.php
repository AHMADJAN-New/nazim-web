<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;

class FeeExceptionUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fee_assignment_id' => ['sometimes', 'uuid', 'exists:fee_assignments,id'],
            'student_id' => ['sometimes', 'uuid', 'exists:students,id'],
            'exception_type' => ['sometimes', 'in:discount_percentage,discount_fixed,waiver,custom'],
            'exception_amount' => ['sometimes', 'numeric', 'min:0'],
            'exception_reason' => ['sometimes', 'string'],
            'approved_by_user_id' => ['sometimes', 'uuid', 'exists:users,id'],
            'approved_at' => ['nullable', 'date'],
            'valid_from' => ['sometimes', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

