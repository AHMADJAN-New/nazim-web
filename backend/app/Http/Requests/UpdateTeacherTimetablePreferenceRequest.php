<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTeacherTimetablePreferenceRequest extends FormRequest
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
            'schedule_slot_ids' => 'sometimes|required|array',
            'schedule_slot_ids.*' => 'uuid|exists:schedule_slots,id',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ];
    }
}

