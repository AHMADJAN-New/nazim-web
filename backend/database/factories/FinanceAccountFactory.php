<?php

namespace Database\Factories;

use App\Models\Currency;
use App\Models\FinanceAccount;
use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class FinanceAccountFactory extends Factory
{
    protected $model = FinanceAccount::class;

    public function definition(): array
    {
        $organization = Organization::factory();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'school_id' => SchoolBranding::factory()->for($organization),
            'name' => fake()->randomElement(['Cash Box', 'Bank Account', 'Petty Cash']),
            'type' => fake()->randomElement(['cash', 'fund']),
            'current_balance' => fake()->numberBetween(0, 100000),
            'opening_balance' => 0,
            'currency_id' => function (array $attributes) {
                return Currency::factory()->create([
                    'organization_id' => $attributes['organization_id'],
                    'school_id' => $attributes['school_id'],
                ])->id;
            },
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
