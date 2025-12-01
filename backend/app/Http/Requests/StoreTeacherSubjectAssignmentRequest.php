<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class StoreTeacherSubjectAssignmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'teacher_id' => [
                'required',
                'uuid',
                Rule::exists('staff', 'id')->where(function ($query) {
                    $query->whereNull('deleted_at');
                }),
            ],
            'class_academic_year_id' => [
                'required',
                'uuid',
                Rule::exists('class_academic_years', 'id')->where(function ($query) {
                    $query->whereNull('deleted_at');
                }),
            ],
            'subject_id' => [
                'required',
                'uuid',
                Rule::exists('subjects', 'id')->where(function ($query) {
                    $query->whereNull('deleted_at');
                }),
            ],
            'schedule_slot_ids' => [
                'required',
                'array',
                'min:1',
            ],
            'schedule_slot_ids.*' => [
                'required',
                'uuid',
            ],
            'school_id' => [
                'nullable',
                'uuid',
                Rule::exists('school_branding', 'id')->where(function ($query) {
                    $query->whereNull('deleted_at');
                }),
            ],
            'academic_year_id' => [
                'nullable',
                'uuid',
                Rule::exists('academic_years', 'id')->where(function ($query) {
                    $query->whereNull('deleted_at');
                }),
            ],
            'organization_id' => [
                'nullable',
                'uuid',
                Rule::exists('organizations', 'id')->where(function ($query) {
                    $query->whereNull('deleted_at');
                }),
            ],
            'is_active' => [
                'nullable',
                'boolean',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Check unique constraint: (teacher_id, class_academic_year_id, subject_id)
            $exists = DB::table('teacher_subject_assignments')
                ->where('teacher_id', $this->teacher_id)
                ->where('class_academic_year_id', $this->class_academic_year_id)
                ->where('subject_id', $this->subject_id)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                $validator->errors()->add(
                    'teacher_id',
                    'A teacher subject assignment already exists for this teacher, class, and subject combination.'
                );
            }

            // Auto-set organization_id and academic_year_id from class_academic_year if not provided
            if (!$this->has('organization_id') || !$this->has('academic_year_id')) {
                $classAcademicYear = DB::table('class_academic_years')
                    ->where('id', $this->class_academic_year_id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($classAcademicYear) {
                    if (!$this->has('organization_id')) {
                        $this->merge(['organization_id' => $classAcademicYear->organization_id]);
                    }
                    if (!$this->has('academic_year_id')) {
                        $this->merge(['academic_year_id' => $classAcademicYear->academic_year_id]);
                    }
                }
            }
        });
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null
        $this->merge([
            'school_id' => $this->school_id ?: null,
            'academic_year_id' => $this->academic_year_id ?: null,
            'organization_id' => $this->organization_id ?: null,
            'notes' => $this->notes ?: null,
            'is_active' => $this->is_active ?? true,
        ]);
    }
}

