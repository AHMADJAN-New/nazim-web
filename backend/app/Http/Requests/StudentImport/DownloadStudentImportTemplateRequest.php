<?php

namespace App\Http\Requests\StudentImport;

use Illuminate\Foundation\Http\FormRequest;

class DownloadStudentImportTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled in controller (permissions + tenancy)
    }

    public function rules(): array
    {
        return [
            'student_fields' => 'required|array|min:1',
            'student_fields.*' => 'required|string|max:100',

            'admission_fields' => 'nullable|array',
            'admission_fields.*' => 'required|string|max:100',

            // If class sheets are provided, academic_year_id is required (admissions are per academic year)
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'class_academic_year_ids' => 'nullable|array',
            'class_academic_year_ids.*' => 'required|uuid|exists:class_academic_years,id',

            // Optional per-class defaults to avoid users guessing IDs
            'class_defaults' => 'nullable|array',
            'class_defaults.*.class_academic_year_id' => 'required|uuid|exists:class_academic_years,id',
            'class_defaults.*.room_id' => 'nullable|uuid|exists:rooms,id',
            'class_defaults.*.residency_type_id' => 'nullable|uuid|exists:residency_types,id',
            'class_defaults.*.shift' => 'nullable|string|max:50',
            'class_defaults.*.enrollment_status' => 'nullable|string|in:pending,admitted,active,inactive,suspended,withdrawn,graduated',
            'class_defaults.*.is_boarder' => 'nullable|boolean',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $classIds = $this->input('class_academic_year_ids', []);
            if (is_array($classIds) && count($classIds) > 0 && !$this->input('academic_year_id')) {
                $validator->errors()->add('academic_year_id', 'Academic year is required when generating class-specific templates.');
            }
        });
    }
}


