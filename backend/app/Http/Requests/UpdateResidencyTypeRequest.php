<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateResidencyTypeRequest extends FormRequest
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
        $residencyTypeId = $this->route('residency-type') ?? $this->route('id');
        $user = $this->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $currentSchoolId = $this->get('current_school_id');
        
        // Get current residency type to determine organization_id
        $currentResidencyType = null;
        if ($residencyTypeId) {
            $currentResidencyType = DB::table('residency_types')
                ->where('id', $residencyTypeId)
                ->whereNull('deleted_at')
                ->first();
        }
        
        $organizationId = $profile->organization_id ?? ($currentResidencyType->organization_id ?? null);

        return [
            'name' => 'sometimes|required|string|max:100',
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($organizationId, $currentSchoolId, $residencyTypeId) {
                    if ($value && $organizationId !== null && $currentSchoolId && $residencyTypeId) {
                        $trimmedCode = strtolower(trim($value));
                        $exists = DB::table('residency_types')
                            ->where('code', $trimmedCode)
                            ->where('organization_id', $organizationId)
                            ->where('school_id', $currentSchoolId)
                            ->where('id', '!=', $residencyTypeId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A residency type with this code already exists for this school.');
                        }
                    }
                },
            ],
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'organization_id' => 'sometimes|nullable|uuid|exists:organizations,id',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge([
                'code' => strtolower(trim($this->code)),
            ]);
        }
        if ($this->has('name')) {
            $this->merge([
                'name' => trim($this->name),
            ]);
        }
        // Ensure is_active is a boolean if provided
        if ($this->has('is_active')) {
            $isActive = $this->is_active;
            if (is_string($isActive)) {
                $isActive = filter_var($isActive, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            }
            $this->merge([
                'is_active' => $isActive !== null ? (bool) $isActive : null,
            ]);
        }
    }
}
