<?php

namespace App\Http\Requests\ExamSeating;

use Illuminate\Foundation\Http\FormRequest;

class SolveExamSeatingMapRequest extends FormRequest
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
            'revision' => 'required|integer|min:1',
            'input_checksum' => ['required', 'string', 'regex:/^[0-9a-f]{64}$/'],
            'strict_mode' => 'sometimes|boolean',
            'seed' => 'nullable|integer|min:1',
            'strategy' => 'sometimes|string|in:default,zigzag',
        ];
    }
}
