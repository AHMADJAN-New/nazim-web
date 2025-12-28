<?php

namespace Database\Factories;

use App\Models\ClassModel;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ClassModelFactory extends Factory
{
    protected $model = ClassModel::class;

    public function definition(): array
    {
        $organization = Organization::factory()->create();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'class_name' => 'Class ' . fake()->numberBetween(1, 12),
            'grade_level' => fake()->numberBetween(1, 12),
            'description' => fake()->sentence(),
        ];
    }
}
