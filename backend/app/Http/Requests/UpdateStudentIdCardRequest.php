<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentIdCardRequest extends FormRequest
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
        $cardId = $this->route('student_id_card');

        return [
            // Prevent organization_id, student_id, student_admission_id, and academic_year_id changes
            'organization_id' => 'prohibited',
            'student_id' => 'prohibited',
            'student_admission_id' => 'prohibited',
            'academic_year_id' => 'prohibited',
            
            // Allow template change (if needed)
            'id_card_template_id' => [
                'sometimes',
                'uuid',
                'exists:id_card_templates,id',
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
            'card_number' => [
                'nullable',
                'string',
                'max:50',
                'unique:student_id_cards,card_number,' . $cardId . ',id,deleted_at,NULL',
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
            'is_printed' => [
                'nullable',
                'boolean',
            ],
            'printed_at' => [
                'nullable',
                'date',
                'required_if:is_printed,true',
            ],
            'printed_by' => [
                'nullable',
                'uuid',
                'exists:profiles,id',
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
            'id_card_template_id.exists' => 'Selected ID card template does not exist.',
            'card_number.unique' => 'This card number is already in use.',
            'card_fee.numeric' => 'Card fee must be a valid number.',
            'card_fee.min' => 'Card fee cannot be negative.',
            'card_fee_paid_date.required_if' => 'Card fee paid date is required when fee is marked as paid.',
            'printed_at.required_if' => 'Printed date is required when card is marked as printed.',
            'printed_by.exists' => 'Selected user does not exist.',
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
            'printed_by',
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

