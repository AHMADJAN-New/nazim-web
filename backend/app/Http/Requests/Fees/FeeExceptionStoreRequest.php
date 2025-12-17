<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;

class FeeExceptionStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organization_id' => ['required', 'uuid', 'exists:organizations,id'],
            'fee_assignment_id' => ['required', 'uuid', 'exists:fee_assignments,id'],
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'exception_type' => ['required', 'in:discount_percentage,discount_fixed,waiver,custom'],
            'exception_amount' => ['required', 'numeric', 'min:0'],
            'exception_reason' => ['required', 'string'],
            'approved_by_user_id' => ['required', 'uuid', 'exists:users,id'],
            'approved_at' => ['nullable', 'date'],
            'valid_from' => ['required', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

