<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'asset_tag' => 'required|string|max:100',
            'category' => 'nullable|string|max:150',
            'serial_number' => 'nullable|string|max:150',
            'purchase_date' => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'total_copies' => 'nullable|integer|min:1',
            'status' => 'nullable|in:available,assigned,maintenance,retired,lost,disposed',
            'condition' => 'nullable|string|max:50',
            'vendor' => 'nullable|string|max:150',
            'warranty_expiry' => 'nullable|date',
            'location_notes' => 'nullable|string',
            'notes' => 'nullable|string',
            'school_id' => 'nullable|uuid',
            'building_id' => 'nullable|uuid',
            'room_id' => 'nullable|uuid',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'finance_account_id' => 'nullable|uuid|exists:finance_accounts,id',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => $this->name ? trim($this->name) : null,
            'asset_tag' => $this->asset_tag ? trim($this->asset_tag) : null,
        ]);
    }
}
