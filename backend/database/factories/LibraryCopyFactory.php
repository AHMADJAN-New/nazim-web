<?php

namespace Database\Factories;

use App\Models\LibraryCopy;
use App\Models\LibraryBook;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LibraryCopyFactory extends Factory
{
    protected $model = LibraryCopy::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'book_id' => LibraryBook::factory(),
            'copy_code' => fake()->unique()->numerify('COPY-####'),
            'status' => 'available',
            'acquired_at' => now(),
        ];
    }

    public function borrowed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'borrowed',
        ]);
    }
}
