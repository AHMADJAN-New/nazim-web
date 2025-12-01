<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateRoomRequest extends FormRequest
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
        $roomId = $this->route('room') ?? $this->route('id');
        $buildingId = $this->input('building_id');

        return [
            'room_number' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                function ($attribute, $value, $fail) use ($buildingId, $roomId) {
                    if ($buildingId && $roomId) {
                        $exists = DB::table('rooms')
                            ->where('room_number', trim($value))
                            ->where('building_id', $buildingId)
                            ->where('id', '!=', $roomId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A room with this number already exists in this building.');
                        }
                    }
                },
            ],
            'building_id' => 'sometimes|uuid|exists:buildings,id',
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
