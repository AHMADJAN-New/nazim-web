<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class StoreRoomRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled in controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $buildingId = $this->input('building_id');

        return [
            'room_number' => [
                'required',
                'string',
                'max:100',
                function ($attribute, $value, $fail) use ($buildingId) {
                    if ($buildingId) {
                        $exists = DB::table('rooms')
                            ->where('room_number', trim($value))
                            ->where('building_id', $buildingId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A room with this number already exists in this building.');
                        }
                    }
                },
            ],
            'building_id' => 'required|uuid|exists:buildings,id',
            'staff_id' => 'nullable|uuid|exists:staff,id',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('room_number')) {
            $this->merge([
                'room_number' => trim($this->room_number),
            ]);
        }
    }
}
