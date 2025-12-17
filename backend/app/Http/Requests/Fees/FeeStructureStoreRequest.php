<?php

namespace App\Http\Requests\Fees;

use Illuminate\Foundation\Http\FormRequest;

class FeeStructureStoreRequest extends FormRequest
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
            'academic_year_id' => ['required', 'uuid', 'exists:academic_years,id'],
            'class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'class_academic_year_id' => ['nullable', 'uuid', 'exists:class_academic_years,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'fee_type' => ['required', 'in:one_time,monthly,quarterly,semester,annual,custom'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'due_date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active' => ['boolean'],
            'is_required' => ['boolean'],
            'display_order' => ['integer'],
        ];
    }
}

