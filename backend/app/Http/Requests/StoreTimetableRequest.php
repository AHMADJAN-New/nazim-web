<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class StoreTimetableRequest extends FormRequest
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
            'name' => [
                'required',
                'string',
                'max:150',
            ],
            'timetable_type' => 'nullable|string|max:50|in:teaching,exam,other',
            'description' => 'nullable|string',
            'organization_id' => 'sometimes|nullable|uuid|exists:organizations,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'is_active' => 'nullable|boolean',
            'entries' => 'required|array|min:1',
            'entries.*.class_academic_year_id' => 'required|uuid|exists:class_academic_years,id',
            'entries.*.subject_id' => 'required|uuid|exists:subjects,id',
            'entries.*.teacher_id' => 'required|uuid|exists:staff,id',
            'entries.*.schedule_slot_id' => 'required|uuid|exists:schedule_slots,id',
            'entries.*.day_name' => 'required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday,all_year',
            'entries.*.period_order' => 'required|integer|min:0',
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

