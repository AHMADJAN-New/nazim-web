<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class SchoolBrandingFactory extends Factory
{
    protected $model = SchoolBranding::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'school_name' => fake()->company() . ' Madrasa',
            'school_name_arabic' => 'مدرسة ' . fake()->word(),
            'school_name_pashto' => null,
            'school_address' => fake()->address(),
            'school_phone' => fake()->phoneNumber(),
            'school_email' => fake()->companyEmail(),
            'school_website' => fake()->url(),
            'logo_path' => null,
            'header_image_path' => null,
            'footer_text' => fake()->sentence(),
            'primary_color' => '#1e40af',
            'secondary_color' => '#64748b',
            'accent_color' => '#f59e0b',
        ];
    }
}
