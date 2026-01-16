<?php

namespace Database\Factories;

use App\Models\Currency;
use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CurrencyFactory extends Factory
{
    protected $model = Currency::class;

    public function definition(): array
    {
        $organization = Organization::factory();
        $code = fake()->unique()->currencyCode();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'school_id' => SchoolBranding::factory()->for($organization),
            'name' => $code,
            'code' => $code,
            'symbol' => fake()->randomElement(['$', 'AFN', 'EUR']),
            'decimal_places' => 2,
            'is_base' => false,
            'is_active' => true,
        ];
    }
}