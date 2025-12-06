<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssetMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'maintenance_type' => 'nullable|string|max:120',
            'status' => 'nullable|in:scheduled,in_progress,completed',
            'performed_on' => 'nullable|date',
            'next_due_date' => 'nullable|date',
            'cost' => 'nullable|numeric|min:0',
            'vendor' => 'nullable|string|max:150',
            'notes' => 'nullable|string',
        ];
    }
}
