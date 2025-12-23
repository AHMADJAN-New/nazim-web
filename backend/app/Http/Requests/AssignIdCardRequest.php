<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class AssignIdCardRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled in controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => [
                'required',
                'uuid',
                'exists:academic_years,id',
            ],
            'id_card_template_id' => [
                'required',
                'uuid',
                'exists:id_card_templates,id',
            ],
            'student_ids' => [
                'required',
                'array',
                'min:1',
            ],
            'student_ids.*' => [
                'required',
                'uuid',
                'exists:students,id',
            ],
            'class_id' => [
                'nullable',
                'uuid',
                'exists:classes,id',
            ],
            'class_academic_year_id' => [
                'nullable',
                'uuid',
                'exists:class_academic_years,id',
            ],
            'card_fee' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999.99',
            ],
            'card_fee_paid' => [
                'nullable',
                'boolean',
            ],
            'card_fee_paid_date' => [
                'nullable',
                'date',
                'required_if:card_fee_paid,true',
            ],
            'account_id' => [
                'nullable',
                'uuid',
                'exists:finance_accounts,id',
                'required_if:card_fee_paid,true',
            ],
            'income_category_id' => [
                'nullable',
                'uuid',
                'exists:income_categories,id',
                'required_if:card_fee_paid,true',
            ],
            'card_number' => [
                'nullable',
                'string',
                'max:50',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'academic_year_id.required' => 'Academic year is required.',
            'academic_year_id.exists' => 'Selected academic year does not exist.',
            'id_card_template_id.required' => 'ID card template is required.',
            'id_card_template_id.exists' => 'Selected ID card template does not exist.',
            'student_ids.required' => 'At least one student must be selected.',
            'student_ids.array' => 'Student IDs must be an array.',
            'student_ids.min' => 'At least one student must be selected.',
            'student_ids.*.exists' => 'One or more selected students do not exist.',
            'card_fee.numeric' => 'Card fee must be a valid number.',
            'card_fee.min' => 'Card fee cannot be negative.',
            'card_fee_paid_date.required_if' => 'Card fee paid date is required when fee is marked as paid.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for optional fields
        $fieldsToClean = [
            'class_id',
            'class_academic_year_id',
            'card_fee',
            'card_number',
            'notes',
        ];

        $data = [];
        foreach ($fieldsToClean as $field) {
            if ($this->has($field)) {
                $value = $this->input($field);
                $data[$field] = (is_string($value) && trim($value) === '') ? null : $value;
            }
        }

        // Convert card_fee to null if empty string
        if ($this->has('card_fee') && ($this->input('card_fee') === '' || $this->input('card_fee') === null)) {
            $data['card_fee'] = null;
        }

        if (!empty($data)) {
            $this->merge($data);
        }
    }
}

