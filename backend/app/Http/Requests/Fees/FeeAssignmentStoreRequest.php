<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;

class FeeAssignmentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organization_id' => ['required', 'uuid', 'exists:organizations,id'],
            'school_id' => ['nullable', 'uuid', 'exists:school_branding,id'],
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'student_admission_id' => ['required', 'uuid', 'exists:student_admissions,id'],
            'fee_structure_id' => ['required', 'uuid', 'exists:fee_structures,id'],
            'academic_year_id' => ['required', 'uuid', 'exists:academic_years,id'],
            'class_academic_year_id' => ['nullable', 'uuid', 'exists:class_academic_years,id'],
            'original_amount' => ['required', 'numeric', 'min:0'],
            'assigned_amount' => ['required', 'numeric', 'min:0'],
            'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'exception_type' => ['nullable', 'in:none,discount_percentage,discount_fixed,waiver,custom'],
            'exception_amount' => ['nullable', 'numeric', 'min:0'],
            'exception_reason' => ['nullable', 'string'],
            'exception_approved_by' => ['nullable', 'uuid', 'exists:users,id'],
            'exception_approved_at' => ['nullable', 'date'],
            'payment_period_start' => ['nullable', 'date'],
            'payment_period_end' => ['nullable', 'date', 'after_or_equal:payment_period_start'],
            'due_date' => ['required', 'date'],
            'status' => ['nullable', 'in:pending,partial,paid,overdue,waived,cancelled'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'remaining_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

