<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateReportTemplateRequest extends FormRequest
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
        $reportTemplateId = $this->route('report-template') ?? $this->route('id');
        $user = $this->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        
        // Get current report template to determine organization_id and school_id
        $currentTemplate = null;
        if ($reportTemplateId) {
            $currentTemplate = DB::table('report_templates')
                ->where('id', $reportTemplateId)
                ->whereNull('deleted_at')
                ->first();
        }
        
        $organizationId = $this->input('organization_id', $currentTemplate->organization_id ?? $profile->organization_id ?? null);
        $schoolId = $this->input('school_id', $currentTemplate->school_id ?? null);

        return [
            'template_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($schoolId, $organizationId, $reportTemplateId) {
                    if ($value && $schoolId && $organizationId && $reportTemplateId) {
                        $exists = DB::table('report_templates')
                            ->where('template_name', $value)
                            ->where('school_id', $schoolId)
                            ->where('organization_id', $organizationId)
                            ->where('id', '!=', $reportTemplateId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A report template with this name already exists for this school.');
                        }
                    }
                },
            ],
            'template_type' => 'sometimes|required|string|in:student_report,attendance_report,fee_report,exam_report,class_report,general_report',
            'school_id' => 'sometimes|required|uuid|exists:school_branding,id',
            'header_text' => 'nullable|string',
            'footer_text' => 'nullable|string',
            'header_html' => 'nullable|string',
            'footer_html' => 'nullable|string',
            'report_logo_selection' => 'nullable|string|max:50',
            'show_page_numbers' => 'boolean',
            'show_generation_date' => 'boolean',
            'table_alternating_colors' => 'boolean',
            'report_font_size' => 'nullable|string|max:10',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'organization_id' => 'sometimes|nullable|uuid|exists:organizations,id',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('template_name')) {
            $this->merge([
                'template_name' => trim($this->template_name),
            ]);
        }
    }
}

