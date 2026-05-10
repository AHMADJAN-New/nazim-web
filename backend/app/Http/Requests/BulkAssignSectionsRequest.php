<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkAssignSectionsRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $sections = $this->input('sections');

        if (is_string($sections)) {
            $sections = [$sections];
        }

        if (is_array($sections)) {
            $normalized = [];

            foreach ($sections as $section) {
                if (! is_string($section)) {
                    continue;
                }

                foreach (preg_split('/[,،]/u', $section) ?: [] as $part) {
                    $part = trim($part);

                    if ($part !== '') {
                        $normalized[] = $part;
                    }
                }
            }

            $this->merge(['sections' => array_values($normalized)]);
        }
    }

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
            'class_id' => 'required|uuid|exists:classes,id',
            'academic_year_id' => 'required|uuid|exists:academic_years,id',
            'sections' => 'required|array|min:1',
            'sections.*' => 'required|string|max:50',
            'default_room_id' => 'nullable|uuid|exists:rooms,id',
            'default_capacity' => 'nullable|integer|min:1|max:500',
        ];
    }
}
