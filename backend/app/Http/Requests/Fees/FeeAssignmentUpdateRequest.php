<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;

class FeeAssignmentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_id' => ['nullable', 'uuid', 'exists:school_branding,id'],
            'fee_structure_id' => ['nullable', 'uuid', 'exists:fee_structures,id'],
            'academic_year_id' => ['nullable', 'uuid', 'exists:academic_years,id'],
            'class_academic_year_id' => ['nullable', 'uuid', 'exists:class_academic_years,id'],
            'original_amount' => ['nullable', 'numeric', 'min:0'],
            'assigned_amount' => ['nullable', 'numeric', 'min:0'],
            'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'exception_type' => ['nullable', 'in:none,discount_percentage,discount_fixed,waiver,custom'],
            'exception_amount' => ['nullable', 'numeric', 'min:0'],
            'exception_reason' => ['nullable', 'string'],
            'exception_approved_by' => ['nullable', 'uuid', 'exists:users,id'],
            'exception_approved_at' => ['nullable', 'date'],
            'payment_period_start' => ['nullable', 'date'],
            'payment_period_end' => ['nullable', 'date', 'after_or_equal:payment_period_start'],
            'due_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:pending,partial,paid,overdue,waived,cancelled'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

