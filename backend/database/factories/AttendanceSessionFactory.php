<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\AttendanceSession;
use App\Models\ClassModel;
use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AttendanceSessionFactory extends Factory
{
    protected $model = AttendanceSession::class;

    public function definition(): array
    {
        $organization = Organization::factory();

        return [
            'id' => (string) Str::uuid(),
            'organization_id' => $organization,
            'school_id' => function (array $attributes) {
                return SchoolBranding::factory()->create([
                    'organization_id' => $attributes['organization_id']
                ])->id;
            },
            'class_id' => ClassModel::factory()->for($organization),
            'academic_year_id' => function (array $attributes) {
                return AcademicYear::factory()->create([
                    'organization_id' => $attributes['organization_id']
                ])->id;
            },
            'created_by' => User::factory(),
            'session_date' => now(),
            'method' => 'daily',
            'status' => 'open',
        ];
    }
}
