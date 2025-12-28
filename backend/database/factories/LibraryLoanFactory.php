<?php

namespace Database\Factories;

use App\Models\LibraryLoan;
use App\Models\LibraryCopy;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LibraryLoanFactory extends Factory
{
    protected $model = LibraryLoan::class;

    public function definition(): array
    {
        $borrowedDate = fake()->dateTimeBetween('-30 days', 'now');

        return [
            'id' => (string) Str::uuid(),
            'library_copy_id' => LibraryCopy::factory(),
            'student_id' => Student::factory(),
            'borrowed_date' => $borrowedDate,
            'due_date' => (clone $borrowedDate)->modify('+14 days'),
            'returned_date' => null,
            'status' => 'borrowed',
            'fine_amount' => 0,
            'remarks' => fake()->optional()->sentence(),
        ];
    }

    public function returned(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'returned',
                'returned_date' => now(),
            ];
        });
    }

    public function overdue(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'due_date' => now()->subDays(5),
                'status' => 'overdue',
                'fine_amount' => 50,
            ];
        });
    }
}
