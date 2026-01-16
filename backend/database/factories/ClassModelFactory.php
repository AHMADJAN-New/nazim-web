<?php

namespace Database\Factories;

use App\Models\ClassModel;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

use App\Models\SchoolBranding;

class ClassModelFactory extends Factory
{
    protected $model = ClassModel::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'school_id' => function (array $attributes) {
                return SchoolBranding::factory()->create([
                    'organization_id' => $attributes['organization_id']
                ])->id;
            },
            'name' => 'Class ' . fake()->numberBetween(1, 12),
            'code' => fake()->unique()->lexify('CLS-????'),
            'grade_level' => fake()->numberBetween(1, 12),
            'default_capacity' => 30,
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
