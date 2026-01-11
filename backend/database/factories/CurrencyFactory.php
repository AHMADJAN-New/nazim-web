<?php

namespace Database\Factories;

use App\Models\Currency;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CurrencyFactory extends Factory
{
    protected $model = Currency::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'name' => fake()->currencyCode(),
            'code' => fake()->unique()->currencyCode(),
            'symbol' => '$',
            'is_default' => false,
            'exchange_rate' => 1.0,
        ];
    }
}

