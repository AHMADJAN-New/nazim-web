<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class StoreReportTemplateRequest extends FormRequest
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
        $user = $this->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $organizationId = $this->input('organization_id', $profile->organization_id ?? null);
        $schoolId = $this->input('school_id');

        return [
            'template_name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($schoolId, $organizationId) {
                    if ($schoolId && $organizationId) {
                        $exists = DB::table('report_templates')
                            ->where('template_name', $value)
                            ->where('school_id', $schoolId)
                            ->where('organization_id', $organizationId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A report template with this name already exists for this school.');
                        }
                    }
                },
            ],
            'template_type' => 'required|string|in:student_report,attendance_report,fee_report,exam_report,class_report,general_report',
            'school_id' => 'required|uuid|exists:school_branding,id',
            'header_text' => 'nullable|string',
            'header_text_position' => 'nullable|string|in:above_school_name,below_school_name',
            'footer_text' => 'nullable|string',
            'footer_text_position' => 'nullable|string|in:footer',
            'header_html' => 'nullable|string',
            'footer_html' => 'nullable|string',
            'report_logo_selection' => 'nullable|string|max:50',
            'show_primary_logo' => 'boolean',
            'show_secondary_logo' => 'boolean',
            'show_ministry_logo' => 'boolean',
            'primary_logo_position' => 'nullable|string|in:left,right',
            'secondary_logo_position' => 'nullable|string|in:left,right',
            'ministry_logo_position' => 'nullable|string|in:left,right',
            'show_page_numbers' => 'boolean',
            'show_generation_date' => 'boolean',
            'table_alternating_colors' => 'boolean',
            'report_font_size' => 'nullable|string|max:10',
            'watermark_id' => [
                'nullable',
                'string',
                function ($attribute, $value, $fail) {
                    // Allow sentinel UUID for "no watermark", or valid UUID
                    $noWatermarkSentinel = '00000000-0000-0000-0000-000000000000';
                    if ($value && $value !== $noWatermarkSentinel && !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value)) {
                        $fail('The watermark_id must be a valid UUID or the sentinel UUID for "no watermark".');
                    }
                },
            ],
            'is_default' => 'boolean',
            'is_active' => 'boolean',
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

