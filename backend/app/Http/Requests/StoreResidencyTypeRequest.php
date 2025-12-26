<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class StoreResidencyTypeRequest extends FormRequest
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
        $user = $this->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $organizationId = $profile->organization_id ?? null;
        $currentSchoolId = $this->get('current_school_id');

        return [
            'name' => 'required|string|max:100',
            'code' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($organizationId, $currentSchoolId) {
                    $trimmedCode = strtolower(trim($value));
                    $exists = DB::table('residency_types')
                        ->where('code', $trimmedCode)
                        ->where('organization_id', $organizationId)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->exists();
                    if ($exists) {
                        $fail('A residency type with this code already exists for this school.');
                    }
                },
            ],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            // Scope is derived from user profile + school.context middleware.
            'organization_id' => 'nullable|uuid|exists:organizations,id',
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
    }
}
