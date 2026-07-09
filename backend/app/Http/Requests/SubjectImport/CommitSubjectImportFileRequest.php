<?php

namespace App\Http\Requests\SubjectImport;

use Illuminate\Foundation\Http\FormRequest;

class CommitSubjectImportFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx|max:10240',
        ];
    }
}
