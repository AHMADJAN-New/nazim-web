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
        return [
            'id' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'class_id' => ClassModel::factory(),
            'session_date' => now(),
            'session_type' => 'daily',
            'status' => 'active',
        ];
    }
}
