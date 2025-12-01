<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateBuildingRequest extends FormRequest
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
        $buildingId = $this->route('building') ?? $this->route('id');
        $schoolId = $this->input('school_id');

        return [
            'building_name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                function ($attribute, $value, $fail) use ($schoolId, $buildingId) {
                    if ($schoolId && $buildingId) {
                        $exists = DB::table('buildings')
                            ->where('building_name', trim($value))
                            ->where('school_id', $schoolId)
                            ->where('id', '!=', $buildingId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A building with this name already exists in this school.');
                        }
                    }
                },
            ],
            'school_id' => 'sometimes|uuid|exists:school_branding,id',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('building_name')) {
            $this->merge([
                'building_name' => trim($this->building_name),
            ]);
        }
    }
}
