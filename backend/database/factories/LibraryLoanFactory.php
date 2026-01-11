<?php

namespace Database\Factories;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Models\LibraryLoan;
use App\Models\Student;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LibraryLoanFactory extends Factory
{
    protected $model = LibraryLoan::class;

    public function definition(): array
    {
        $organization = Organization::factory();
        $book = LibraryBook::factory()->create(['organization_id' => $organization->id]);
        $copy = LibraryCopy::factory()->create(['book_id' => $book->id]);
        $loanDate = fake()->dateTimeBetween('-30 days', 'now');

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'book_id' => $book->id,
            'book_copy_id' => $copy->id,
            'student_id' => Student::factory()->state(['organization_id' => $organization->id]),
            'loan_date' => $loanDate,
            'due_date' => (clone $loanDate)->modify('+14 days'),
            'returned_at' => null,
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function returned(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'returned_at' => now(),
            ];
        });
    }

    public function overdue(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'due_date' => now()->subDays(5),
            ];
        });
    }
}
