<?php

namespace App\Http\Requests\SubjectImport;

use Illuminate\Foundation\Http\FormRequest;

class DownloadSubjectImportTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject_fields' => 'nullable|array',
            'subject_fields.*' => 'required|string|max:100',

            'academic_year_id' => 'required|uuid|exists:academic_years,id',
            'class_academic_year_ids' => 'required|array|min:1',
            'class_academic_year_ids.*' => 'required|uuid|exists:class_academic_years,id',

            'class_defaults' => 'nullable|array',
            'class_defaults.*.class_academic_year_id' => 'required|uuid|exists:class_academic_years,id',
            'class_defaults.*.room_id' => 'nullable|uuid|exists:rooms,id',
            'class_defaults.*.is_required' => 'nullable|boolean',
            'class_defaults.*.hours_per_week' => 'nullable|integer|min:0|max:40',
            'class_defaults.*.credits' => 'nullable|integer|min:0',
        ];
    }
}
