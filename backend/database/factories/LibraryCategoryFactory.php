<?php

namespace Database\Factories;

use App\Models\LibraryCategory;
use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LibraryCategoryFactory extends Factory
{
    protected $model = LibraryCategory::class;

    public function definition(): array
    {
        $organization = Organization::factory();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'school_id' => SchoolBranding::factory()->for($organization),
            'name' => fake()->randomElement(['Islamic Studies', 'Science', 'Mathematics', 'History', 'Literature']),
            'description' => fake()->sentence(),
        ];
    }
}
