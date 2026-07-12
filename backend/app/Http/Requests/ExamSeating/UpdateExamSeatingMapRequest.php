<?php

namespace App\Http\Requests\ExamSeating;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExamSeatingMapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'rows' => 'sometimes|integer|min:1|max:100',
            'columns' => 'sometimes|integer|min:1|max:100',
            'start_seat_number' => 'sometimes|integer|min:1',
        ];
    }
}
