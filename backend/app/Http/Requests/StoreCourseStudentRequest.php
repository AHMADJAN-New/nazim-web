<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare data for validation so string fields get strings and integer fields get int|null.
     * This prevents validation failures when the client sends e.g. a number for home_address.
     */
    protected function prepareForValidation(): void
    {
        $stringKeys = [
            'admission_no', 'card_number', 'full_name', 'father_name', 'grandfather_name', 'mother_name',
            'gender', 'orig_province', 'orig_district', 'orig_village', 'curr_province', 'curr_district', 'curr_village',
            'nationality', 'preferred_language', 'previous_school', 'guardian_name', 'guardian_relation',
            'guardian_phone', 'guardian_tazkira', 'guardian_picture_path', 'home_address', 'zamin_name',
            'zamin_phone', 'zamin_tazkira', 'zamin_address', 'emergency_contact_name', 'emergency_contact_phone',
            'family_income', 'picture_path', 'disability_status', 'completion_status', 'grade',
        ];
        $data = $this->all();
        foreach ($stringKeys as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '' && !is_string($data[$key])) {
                $data[$key] = (string) $data[$key];
            }
        }
        foreach (['birth_year', 'age'] as $key) {
            if (array_key_exists($key, $data)) {
                $v = $data[$key];
                if ($v === null || $v === '') {
                    $data[$key] = null;
                } elseif (is_numeric($v)) {
                    $data[$key] = (int) $v;
                }
            }
        }
        if (array_key_exists('fee_amount', $data)) {
            $v = $data['fee_amount'];
            if ($v === null || $v === '') {
                $data['fee_amount'] = null;
            } elseif (is_numeric($v)) {
                $data['fee_amount'] = (float) $v;
            }
        }
        $this->merge($data);
    }

    public function rules(): array
    {
        return [
            'organization_id' => ['required', 'uuid'],
            'course_id' => ['required', 'uuid'],
            'main_student_id' => ['nullable', 'uuid'],
            'admission_no' => ['nullable', 'string', 'max:255'],
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
