<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ExamFactory extends Factory
{
    protected $model = Exam::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'academic_year_id' => AcademicYear::factory(),
            'exam_name' => fake()->randomElement(['Midterm', 'Final', 'Quiz']) . ' ' . fake()->word(),
            'exam_type' => fake()->randomElement(['midterm', 'final', 'quiz', 'monthly']),
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(14),
            'status' => 'scheduled',
            'description' => fake()->sentence(),
        ];
    }

    public function ongoing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ongoing',
            'start_date' => now()->subDays(2),
            'end_date' => now()->addDays(5),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'start_date' => now()->subDays(14),
            'end_date' => now()->subDays(7),
        ]);
    }
}
