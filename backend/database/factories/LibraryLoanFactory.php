<?php

namespace Database\Factories;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Models\LibraryLoan;
use App\Models\SchoolBranding;
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
        $school = SchoolBranding::factory()->for($organization);
        $book = LibraryBook::factory()->state([
            'organization_id' => $organization,
            'school_id' => $school,
        ]);
        $copy = LibraryCopy::factory()->state([
            'book_id' => $book,
            'school_id' => $school,
        ]);
        $loanDate = fake()->dateTimeBetween('-30 days', 'now');

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'school_id' => $school,
            'book_id' => $book,
            'book_copy_id' => $copy,
            'student_id' => Student::factory()->state(function (array $attributes) {
                return [
                    'organization_id' => $attributes['organization_id'],
                    'school_id' => $attributes['school_id'],
                ];
            }),
            'loan_date' => $loanDate->format('Y-m-d'),
            'due_date' => (clone $loanDate)->modify('+14 days')->format('Y-m-d'),
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
