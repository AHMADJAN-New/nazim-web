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
            'capacity' => 'nullable|integer|min:1|max:200',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
