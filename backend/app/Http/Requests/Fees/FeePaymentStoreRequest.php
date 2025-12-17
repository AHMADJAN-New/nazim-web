<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;

class FeePaymentStoreRequest extends FormRequest
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
            'fee_assignment_id' => ['required', 'uuid', 'exists:fee_assignments,id'],
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'student_admission_id' => ['required', 'uuid', 'exists:student_admissions,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'payment_date' => ['required', 'date'],
            'payment_method' => ['required', 'in:cash,bank_transfer,cheque,other'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'account_id' => ['required', 'uuid', 'exists:finance_accounts,id'],
            'received_by_user_id' => ['nullable', 'uuid', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

