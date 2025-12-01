<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTimetableRequest extends FormRequest
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
            'name' => 'sometimes|required|string|max:150',
            'timetable_type' => 'sometimes|nullable|string|max:50|in:teaching,exam,other',
            'description' => 'nullable|string',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'is_active' => 'nullable|boolean',
            'organization_id' => 'sometimes|nullable|uuid|exists:organizations,id',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge([
                'name' => trim($this->name),
            ]);
        }
    }
}

