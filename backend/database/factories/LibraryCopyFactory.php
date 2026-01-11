<?php

namespace Database\Factories;

use App\Models\LibraryCopy;
use App\Models\LibraryBook;
use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LibraryCopyFactory extends Factory
{
    protected $model = LibraryCopy::class;

    public function definition(): array
    {
        $organization = Organization::factory();
        $school = SchoolBranding::factory()->for($organization);

        return [
            'id' => (string) Str::uuid(),
            'book_id' => LibraryBook::factory()->state([
                'organization_id' => $organization,
                'school_id' => $school,
            ]),
            'school_id' => $school,
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
