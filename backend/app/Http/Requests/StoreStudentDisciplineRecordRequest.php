<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentDisciplineRecordRequest extends FormRequest
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
            'incident_date' => 'required|date',
            'incident_type' => 'required|string|max:100',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'description' => 'nullable|string',
            'severity' => 'nullable|string|in:minor,moderate,major,severe',
            'action_taken' => 'nullable|string',
            'resolved' => 'boolean',
            'resolved_date' => 'nullable|date',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $fieldsToClean = [
            'school_id', 'description', 'action_taken', 'resolved_date',
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

        if ($this->has('incident_type')) {
            $this->merge(['incident_type' => trim($this->incident_type)]);
        }
    }
}

