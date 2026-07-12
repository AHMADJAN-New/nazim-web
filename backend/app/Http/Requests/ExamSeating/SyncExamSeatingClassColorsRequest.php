<?php

namespace App\Http\Requests\ExamSeating;

use Illuminate\Foundation\Http\FormRequest;

class SyncExamSeatingClassColorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'class_colors' => 'present|array',
            'class_colors.*.exam_class_id' => 'required|uuid|exists:exam_classes,id',
            'class_colors.*.color_hex' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }
}
