<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\StaffType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class StaffTypeFactory extends Factory
{
    protected $model = StaffType::class;

    public function definition(): array
    {
        $organization = Organization::factory();
        $name = fake()->randomElement(['Teacher', 'Administrator', 'Accountant', 'Librarian']);
        $codeMap = [
            'Teacher' => 'teacher',
            'Administrator' => 'admin',
            'Accountant' => 'accountant',
            'Librarian' => 'librarian',
        ];

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'school_id' => SchoolBranding::factory()->for($organization),
            'name' => $name,
            'code' => $codeMap[$name] ?? strtolower($name),
            'description' => fake()->sentence(),
        ];
    }
}
