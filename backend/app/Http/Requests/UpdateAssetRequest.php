<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'asset_tag' => 'sometimes|string|max:100',
            'category' => 'nullable|string|max:150',
            'serial_number' => 'nullable|string|max:150',
            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:available,assigned,maintenance,retired,lost,disposed',
            'condition' => 'nullable|string|max:50',
            'vendor' => 'nullable|string|max:150',
            'warranty_expiry' => 'nullable|date',
            'location_notes' => 'nullable|string',
            'notes' => 'nullable|string',
            'school_id' => 'nullable|uuid',
            'building_id' => 'nullable|uuid',
            'room_id' => 'nullable|uuid',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->has('name') ? trim((string) $this->name) : $this->name,
            'asset_tag' => $this->has('asset_tag') ? trim((string) $this->asset_tag) : $this->asset_tag,
        ]);
    }
}
