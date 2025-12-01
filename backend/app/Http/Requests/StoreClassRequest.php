<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class StoreClassRequest extends FormRequest
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
        $organizationId = $this->input('organization_id', $profile->organization_id ?? null);

        return [
            'name' => 'required|string|max:100',
            'code' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($organizationId) {
                    $exists = DB::table('classes')
                        ->where('code', strtoupper(trim($value)))
                        ->where('organization_id', $organizationId)
                        ->whereNull('deleted_at')
                        ->exists();
                    if ($exists) {
                        $fail('A class with this code already exists for this organization.');
                    }
                },
            ],
            'grade_level' => 'nullable|integer|min:0|max:12',
            'description' => 'nullable|string|max:500',
            'default_capacity' => 'required|integer|min:1|max:200',
            'is_active' => 'boolean',
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
