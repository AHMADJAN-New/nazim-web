<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateClassRequest extends FormRequest
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
        $classId = $this->route('class');
        $class = DB::table('classes')->where('id', $classId)->whereNull('deleted_at')->first();
        $organizationId = $class->organization_id ?? null;

        return [
            'name' => 'sometimes|required|string|max:100',
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($classId, $organizationId) {
                    $exists = DB::table('classes')
                        ->where('code', strtoupper(trim($value)))
                        ->where('organization_id', $organizationId)
                        ->where('id', '!=', $classId)
                        ->whereNull('deleted_at')
                        ->exists();
                    if ($exists) {
                        $fail('A class with this code already exists for this organization.');
                    }
                },
            ],
            'grade_level' => 'nullable|integer|min:0|max:12',
            'description' => 'nullable|string|max:500',
            'default_capacity' => 'sometimes|required|integer|min:1|max:200',
            'is_active' => 'sometimes|boolean',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge([
                'code' => strtoupper(trim($this->code)),
            ]);
        }
        if ($this->has('name')) {
            $this->merge([
                'name' => trim($this->name),
            ]);
        }
    }
}
