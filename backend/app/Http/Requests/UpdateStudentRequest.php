<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateStudentRequest extends FormRequest
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
        $studentId = $this->route('student');
        $user = $this->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        
        // Get the student's organization_id
        // If student doesn't exist, let controller handle 404 - use profile's org_id for validation
        $student = DB::table('students')->where('id', $studentId)->whereNull('deleted_at')->first();
        $organizationId = $student ? ($student->organization_id ?? $profile->organization_id ?? null) : ($profile->organization_id ?? null);

        return [
            'admission_no' => [
                'sometimes',
                'required',
                'string',
                'min:1',
                'max:100',
                function ($attribute, $value, $fail) use ($organizationId, $studentId) {
                    // Don't allow empty strings
                    if (trim($value) === '') {
                        $fail('The admission number cannot be empty.');
                        return;
                    }
                    if ($organizationId) {
                        $exists = DB::table('students')
                            ->where('admission_no', $value)
                            ->where('organization_id', $organizationId)
                            ->where('id', '!=', $studentId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A student with this admission number already exists in this organization.');
                        }
                    }
                },
            ],
            'student_code' => [
                'nullable',
                'string',
                'max:32',
                function ($attribute, $value, $fail) use ($organizationId, $studentId) {
                    if ($value && $organizationId) {
                        $exists = DB::table('students')
                            ->where('student_code', $value)
                            ->where('organization_id', $organizationId)
                            ->where('id', '!=', $studentId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A student with this code already exists in this organization.');
                        }
                    }
                },
            ],
            'full_name' => [
                'sometimes',
                'string',
                'max:150',
                function ($attribute, $value, $fail) {
                    // Don't allow empty strings
                    if (trim($value) === '') {
                        $fail('The full name cannot be empty.');
                    }
                },
            ],
            'father_name' => [
                'sometimes',
                'string',
                'max:150',
                function ($attribute, $value, $fail) {
                    // Don't allow empty strings
                    if (trim($value) === '') {
                        $fail('The father name cannot be empty.');
                    }
                },
            ],
            'gender' => 'sometimes|string|in:male,female',
            // Prevent organization_id changes
            'organization_id' => 'prohibited',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'card_number' => 'nullable|string|max:50',
            'tazkira_number' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:25',
            'notes' => 'nullable|string',
            'grandfather_name' => 'nullable|string|max:150',
            'mother_name' => 'nullable|string|max:150',
            'birth_year' => 'nullable|string|max:10',
            'birth_date' => 'nullable|date',
            'age' => 'nullable|integer|min:1|max:100',
            'admission_year' => 'nullable|string|max:10',
            'orig_province' => 'nullable|string|max:100',
            'orig_district' => 'nullable|string|max:100',
            'orig_village' => 'nullable|string|max:150',
            'curr_province' => 'nullable|string|max:100',
            'curr_district' => 'nullable|string|max:100',
            'curr_village' => 'nullable|string|max:150',
            'nationality' => 'nullable|string|max:100',
            'preferred_language' => 'nullable|string|max:100',
            'previous_school' => 'nullable|string|max:150',
            'guardian_name' => 'nullable|string|max:150',
            'guardian_relation' => 'nullable|string|max:100',
            'guardian_phone' => 'nullable|string|max:25',
            'guardian_tazkira' => 'nullable|string|max:100',
            'guardian_picture_path' => 'nullable|string|max:255',
            'home_address' => 'nullable|string',
            'zamin_name' => 'nullable|string|max:150',
            'zamin_phone' => 'nullable|string|max:25',
            'zamin_tazkira' => 'nullable|string|max:100',
            'zamin_address' => 'nullable|string',
            'applying_grade' => 'nullable|string|max:50',
            'is_orphan' => 'boolean',
            'admission_fee_status' => 'nullable|string|in:paid,pending,waived,partial',
            'student_status' => 'nullable|string|in:applied,admitted,active,withdrawn',
            'disability_status' => 'nullable|string|max:150',
            'emergency_contact_name' => 'nullable|string|max:150',
            'emergency_contact_phone' => 'nullable|string|max:25',
            'family_income' => 'nullable|string|max:100',
            'picture_path' => 'nullable|string|max:255',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Remove organization_id from request to prevent validation error
        // Organization ID should never be changed during updates
        $data = $this->all();
        if (isset($data['organization_id'])) {
            unset($data['organization_id']);
            $this->merge($data);
        }

        // Convert empty strings to null for optional fields
        $fieldsToClean = [
            'card_number', 'tazkira_number', 'phone', 'notes', 'grandfather_name', 'mother_name', 'birth_year', 'birth_date',
            'orig_province', 'orig_district', 'orig_village', 'curr_province', 'curr_district',
            'curr_village', 'nationality', 'preferred_language', 'previous_school',
            'guardian_name', 'guardian_relation', 'guardian_phone', 'guardian_tazkira',
            'guardian_picture_path', 'home_address', 'zamin_name', 'zamin_phone',
            'zamin_tazkira', 'zamin_address', 'applying_grade', 'disability_status',
            'emergency_contact_name', 'emergency_contact_phone', 'family_income', 'picture_path',
            'admission_year', 'school_id',
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

        // Trim string fields
        if ($this->has('admission_no')) {
            $this->merge(['admission_no' => trim($this->admission_no)]);
        }
        if ($this->has('full_name')) {
            $this->merge(['full_name' => trim($this->full_name)]);
        }
        if ($this->has('father_name')) {
            $this->merge(['father_name' => trim($this->father_name)]);
        }
    }
}
