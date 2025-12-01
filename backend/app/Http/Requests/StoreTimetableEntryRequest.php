<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTimetableEntryRequest extends FormRequest
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
            'class_academic_year_id' => 'required|uuid|exists:class_academic_years,id',
            'subject_id' => 'required|uuid|exists:subjects,id',
            'teacher_id' => 'required|uuid|exists:staff,id',
            'schedule_slot_id' => 'required|uuid|exists:schedule_slots,id',
            'day_name' => 'required|string|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday,all_year',
            'period_order' => 'required|integer|min:0',
        ];
    }
}

