<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamType;
use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ExamFactory extends Factory
{
    protected $model = Exam::class;

    public function definition(): array
    {
        $organization = Organization::factory();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'school_id' => function (array $attributes) {
                return SchoolBranding::factory()->create([
                    'organization_id' => $attributes['organization_id']
                ])->id;
            },
            'academic_year_id' => function (array $attributes) {
                return AcademicYear::factory()->create([
                    'organization_id' => $attributes['organization_id'],
                    'school_id' => $attributes['school_id']
                ])->id;
            },
            'exam_type_id' => function (array $attributes) {
                return ExamType::factory()->create([
                    'organization_id' => $attributes['organization_id']
                ])->id;
            },
            'name' => fake()->randomElement(['Midterm', 'Final', 'Quiz']) . ' ' . fake()->word(),
            'start_date' => now()->addDays(7),
            'end_date' => now()->addDays(14),
            'status' => 'draft',
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
