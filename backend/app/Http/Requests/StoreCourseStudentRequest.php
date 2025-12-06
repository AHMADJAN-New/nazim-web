<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organization_id' => ['required', 'uuid'],
            'course_id' => ['required', 'uuid'],
            'main_student_id' => ['nullable', 'uuid'],
            'admission_no' => ['required', 'string', 'max:255'],
            'registration_date' => ['required', 'date'],
            'completion_status' => ['nullable', 'in:enrolled,completed,dropped,failed'],
            'completion_date' => ['nullable', 'date'],
            'grade' => ['nullable', 'string', 'max:255'],
            'certificate_issued' => ['nullable', 'boolean'],
            'certificate_issued_date' => ['nullable', 'date'],
            'fee_paid' => ['nullable', 'boolean'],
            'fee_paid_date' => ['nullable', 'date'],
            'fee_amount' => ['nullable', 'numeric', 'min:0'],
            'card_number' => ['nullable', 'string', 'max:255'],
            'full_name' => ['nullable', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'grandfather_name' => ['nullable', 'string', 'max:255'],
            'mother_name' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:50'],
            'birth_year' => ['nullable', 'integer'],
            'birth_date' => ['nullable', 'date'],
            'age' => ['nullable', 'integer'],
            'orig_province' => ['nullable', 'string', 'max:255'],
            'orig_district' => ['nullable', 'string', 'max:255'],
            'orig_village' => ['nullable', 'string', 'max:255'],
            'curr_province' => ['nullable', 'string', 'max:255'],
            'curr_district' => ['nullable', 'string', 'max:255'],
            'curr_village' => ['nullable', 'string', 'max:255'],
            'nationality' => ['nullable', 'string', 'max:255'],
            'preferred_language' => ['nullable', 'string', 'max:255'],
            'previous_school' => ['nullable', 'string', 'max:255'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_relation' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:255'],
            'guardian_tazkira' => ['nullable', 'string', 'max:255'],
            'guardian_picture_path' => ['nullable', 'string', 'max:255'],
            'home_address' => ['nullable', 'string', 'max:255'],
            'zamin_name' => ['nullable', 'string', 'max:255'],
            'zamin_phone' => ['nullable', 'string', 'max:255'],
            'zamin_tazkira' => ['nullable', 'string', 'max:255'],
            'zamin_address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:255'],
            'family_income' => ['nullable', 'string', 'max:255'],
            'picture_path' => ['nullable', 'string', 'max:255'],
            'is_orphan' => ['nullable', 'boolean'],
            'disability_status' => ['nullable', 'string', 'max:255'],
        ];
    }
}
