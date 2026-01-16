<?php

namespace Database\Factories;

use App\Models\LibraryBook;
use App\Models\FinanceAccount;
use App\Models\Currency;
use App\Models\Organization;
use App\Models\SchoolBranding;
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
            'school_id' => SchoolBranding::factory()->for($organization),
            'title' => fake()->sentence(3),
            'author' => fake()->name(),
            'isbn' => fake()->isbn13(),
            'book_number' => fake()->unique()->numerify('BOOK-####'),
            'category' => fake()->word(),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 10, 100),
            'default_loan_days' => 14,
            'currency_id' => Currency::factory()->state(function (array $attributes) {
                return [
                    'organization_id' => $attributes['organization_id'],
                    'school_id' => $attributes['school_id'],
                ];
            }),
            'finance_account_id' => FinanceAccount::factory()->state(function (array $attributes) {
                return [
                    'organization_id' => $attributes['organization_id'],
                    'school_id' => $attributes['school_id'],
                ];
            }),
        ];
    }
}
