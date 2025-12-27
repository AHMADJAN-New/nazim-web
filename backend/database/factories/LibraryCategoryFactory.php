<?php

namespace Database\Factories;

use App\Models\LibraryCategory;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LibraryCategoryFactory extends Factory
{
    protected $model = LibraryCategory::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'name' => fake()->randomElement(['Islamic Studies', 'Science', 'Mathematics', 'History', 'Literature']),
            'description' => fake()->sentence(),
        ];
    }
}
