<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Profile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProfileFactory extends Factory
{
    protected $model = Profile::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'email' => fake()->unique()->safeEmail(),
            'full_name' => fake()->name(),
            'role' => 'admin',
            'clearance_level_key' => null,
            'organization_id' => Organization::factory(),
            'phone' => fake()->phoneNumber(),
            'avatar_url' => null,
            'is_active' => true,
            'default_school_id' => null,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'super_admin',
            'organization_id' => null,
        ]);
    }

    public function teacher(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'teacher',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
