<?php

namespace Database\Factories;

use App\Models\AttendanceSession;
use App\Models\ClassModel;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AttendanceSessionFactory extends Factory
{
    protected $model = AttendanceSession::class;

    public function definition(): array
    {
        $organization = Organization::factory()->create();
        $class = ClassModel::factory()->create(['organization_id' => $organization->id]);

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'class_id' => $class->id,
            'session_date' => now(),
            'session_type' => 'daily',
            'status' => 'active',
        ];
    }
}
