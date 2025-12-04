<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateStudentAdmissionRequest extends FormRequest
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
        $admissionId = $this->route('student_admission');

        return [
            'student_id' => [
                'sometimes',
                'uuid',
                'exists:students,id',
                function ($attribute, $value, $fail) use ($admissionId) {
                    $academicYearId = $this->input('academic_year_id');
                    if ($academicYearId) {
                        $exists = DB::table('student_admissions')
                            ->where('student_id', $value)
                            ->where('academic_year_id', $academicYearId)
                            ->where('id', '!=', $admissionId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('This student already has an admission for this academic year.');
                        }
                    }
                },
            ],
            // Prevent organization_id and school_id changes
            'organization_id' => 'prohibited',
            'school_id' => 'prohibited',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'class_id' => 'nullable|uuid|exists:classes,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'residency_type_id' => 'nullable|uuid|exists:residency_types,id',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'admission_year' => 'nullable|string|max:10',
            'admission_date' => 'nullable|date',
            'enrollment_status' => 'nullable|string|in:pending,admitted,active,inactive,suspended,withdrawn,graduated',
            'enrollment_type' => 'nullable|string|max:50',
            'shift' => 'nullable|string|max:50',
            'is_boarder' => 'boolean',
            'fee_status' => 'nullable|string|max:50',
            'placement_notes' => 'nullable|string|max:500',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for optional fields
        // Note: school_id is excluded as it's prohibited from updates
        $fieldsToClean = [
            'academic_year_id', 'class_id', 'class_academic_year_id',
            'residency_type_id', 'room_id', 'admission_year', 'enrollment_type',
            'shift', 'fee_status', 'placement_notes',
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
    }
}

