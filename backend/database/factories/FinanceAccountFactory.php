<?php

namespace Database\Factories;

use App\Models\FinanceAccount;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class FinanceAccountFactory extends Factory
{
    protected $model = FinanceAccount::class;

    public function definition(): array
    {
        $organization = Organization::factory()->create();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'account_name' => fake()->randomElement(['Cash Box', 'Bank Account', 'Petty Cash']),
            'account_type' => fake()->randomElement(['cash', 'bank', 'mobile_money']),
            'balance' => fake()->numberBetween(0, 100000),
            'currency' => 'AFN',
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
