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
            'library_book_id' => LibraryBook::factory(),
            'copy_number' => fake()->unique()->numerify('COPY-####'),
            'barcode' => fake()->unique()->ean13(),
            'status' => 'available',
            'condition' => fake()->randomElement(['excellent', 'good', 'fair', 'poor']),
            'location' => fake()->randomElement(['Shelf A1', 'Shelf B2', 'Shelf C3']),
        ];
    }

    public function borrowed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'borrowed',
        ]);
    }
}
