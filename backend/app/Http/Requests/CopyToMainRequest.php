<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CopyToMainRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'generate_new_admission' => ['nullable', 'boolean'],
            'link_to_course_student' => ['nullable', 'boolean'],
        ];
    }
}
