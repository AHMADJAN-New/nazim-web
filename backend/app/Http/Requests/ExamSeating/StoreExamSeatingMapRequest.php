<?php

namespace App\Http\Requests\ExamSeating;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamSeatingMapRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'rows' => 'required|integer|min:1|max:100',
            'columns' => 'required|integer|min:1|max:100',
            'start_seat_number' => 'sometimes|integer|min:1',
        ];
    }
}
