<?php

namespace App\Http\Requests\ExamSeating;

use Illuminate\Foundation\Http\FormRequest;

class SyncExamSeatingMapClassesRequest extends FormRequest
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
            'exam_class_ids' => 'required|array|min:1',
            'exam_class_ids.*' => 'required|uuid|distinct|exists:exam_classes,id',
        ];
    }
}
