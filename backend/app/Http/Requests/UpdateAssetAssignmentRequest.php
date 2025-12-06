<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssetAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assigned_on' => 'nullable|date',
            'expected_return_date' => 'nullable|date',
            'returned_on' => 'nullable|date',
            'status' => 'nullable|in:active,returned,transferred',
            'notes' => 'nullable|string',
        ];
    }
}
