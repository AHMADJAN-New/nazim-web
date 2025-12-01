<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class UpdateSubjectRequest extends FormRequest
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
        $subjectId = $this->route('subject');
        $user = $this->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        $organizationId = $this->input('organization_id', $profile->organization_id ?? null);

        return [
            'name' => 'sometimes|required|string|max:100',
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($organizationId, $subjectId) {
                    $exists = DB::table('subjects')
                        ->where('code', strtoupper(trim($value)))
                        ->where('id', '!=', $subjectId)
                        ->where(function ($q) use ($organizationId) {
                            if ($organizationId) {
                                $q->where('organization_id', $organizationId)
                                  ->orWhereNull('organization_id');
                            } else {
                                $q->whereNull('organization_id');
                            }
                        })
                        ->whereNull('deleted_at')
                        ->exists();
                    if ($exists) {
                        $fail('A subject with this code already exists.');
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

