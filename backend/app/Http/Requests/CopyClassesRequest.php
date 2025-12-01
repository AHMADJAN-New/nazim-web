<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CopyClassesRequest extends FormRequest
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
            'from_academic_year_id' => 'required|uuid|exists:academic_years,id',
            'to_academic_year_id' => 'required|uuid|exists:academic_years,id',
            'class_instance_ids' => 'required|array|min:1',
            'class_instance_ids.*' => 'required|uuid|exists:class_academic_years,id',
            'copy_assignments' => 'boolean',
        ];
    }
}
