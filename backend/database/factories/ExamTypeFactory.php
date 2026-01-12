<?php

namespace Database\Factories;

use App\Models\ExamType;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ExamTypeFactory extends Factory
{
    protected $model = ExamType::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'name' => fake()->randomElement(['Midterm', 'Final', 'Quiz', 'Monthly']),
            'code' => fake()->unique()->lexify('TYPE-????'),
            'description' => fake()->sentence(),
            'display_order' => fake()->numberBetween(1, 10),
            'is_active' => true,
        ];
    }
}

