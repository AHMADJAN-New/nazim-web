<?php

namespace App\Http\Requests\StudentImport;

use Illuminate\Foundation\Http\FormRequest;

class ValidateStudentImportFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled in controller
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx|max:10240', // 10MB
        ];
    }
}


