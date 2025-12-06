<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assigned_to_type' => 'required|in:staff,student,room,other',
            'assigned_to_id' => 'nullable|uuid',
            'assigned_on' => 'nullable|date',
            'expected_return_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ];
    }
}
