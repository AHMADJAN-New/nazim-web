<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\StaffType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class StaffTypeFactory extends Factory
{
    protected $model = StaffType::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'name' => fake()->randomElement(['Teacher', 'Administrator', 'Accountant', 'Librarian']),
            'description' => fake()->sentence(),
        ];
    }
}
