<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AcademicYearFactory extends Factory
{
    protected $model = AcademicYear::class;

    public function definition(): array
    {
        $year = fake()->numberBetween(2020, 2025);

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'school_id' => function (array $attributes) {
                return \App\Models\SchoolBranding::factory()->create([
                    'organization_id' => $attributes['organization_id']
                ])->id;
            },
            'name' => "{$year}-" . ($year + 1),
            'start_date' => "{$year}-01-01",
            'end_date' => ($year + 1) . "-12-31",
            'is_current' => false,
        ];
    }

    public function current(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_current' => true,
        ]);
    }
}
