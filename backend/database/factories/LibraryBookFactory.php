<?php

namespace Database\Factories;

use App\Models\LibraryBook;
use App\Models\LibraryCategory;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LibraryBookFactory extends Factory
{
    protected $model = LibraryBook::class;

    public function definition(): array
    {
        $organization = Organization::factory();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'category_id' => LibraryCategory::factory()->for($organization),
            'title' => fake()->sentence(3),
            'author' => fake()->name(),
            'isbn' => fake()->isbn13(),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 10, 100),
            'default_loan_days' => 14,
        ];
    }
}
