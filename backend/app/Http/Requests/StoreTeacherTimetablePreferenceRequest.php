<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeacherTimetablePreferenceRequest extends FormRequest
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
            'teacher_id' => 'required|uuid|exists:staff,id',
            'schedule_slot_ids' => 'required|array',
            'schedule_slot_ids.*' => 'uuid|exists:schedule_slots,id',
            'organization_id' => 'sometimes|nullable|uuid|exists:organizations,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ];
    }
}

