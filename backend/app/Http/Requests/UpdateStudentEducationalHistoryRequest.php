<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentEducationalHistoryRequest extends FormRequest
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
            'institution_name' => 'sometimes|string|max:255',
            'organization_id' => 'prohibited',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'academic_year' => 'nullable|string|max:20',
            'grade_level' => 'nullable|string|max:50',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'achievements' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $fieldsToClean = [
            'school_id', 'academic_year', 'grade_level', 'start_date', 
            'end_date', 'achievements', 'notes',
        ];

        $data = [];
        foreach ($fieldsToClean as $field) {
            if ($this->has($field)) {
                $value = $this->input($field);
                $data[$field] = (is_string($value) && trim($value) === '') ? null : $value;
            }
        }

        if (!empty($data)) {
            $this->merge($data);
        }

        if ($this->has('institution_name')) {
            $this->merge(['institution_name' => trim($this->institution_name)]);
        }
    }
}

