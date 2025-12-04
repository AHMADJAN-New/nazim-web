<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignClassToYearRequest extends FormRequest
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
            'academic_year_id' => 'required|uuid|exists:academic_years,id',
            'section_name' => 'nullable|string|max:50',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'teacher_id' => 'nullable|uuid|exists:profiles,id',
            'capacity' => 'nullable|integer|min:1|max:200',
            'notes' => 'nullable|string|max:500',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for nullable UUID fields
        if ($this->has('room_id') && $this->room_id === '') {
            $this->merge(['room_id' => null]);
        }
        if ($this->has('teacher_id') && $this->teacher_id === '') {
            $this->merge(['teacher_id' => null]);
        }
        if ($this->has('section_name') && $this->section_name === '') {
            $this->merge(['section_name' => null]);
        }
    }
}
