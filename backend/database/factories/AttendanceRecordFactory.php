<?php

namespace Database\Factories;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AttendanceRecordFactory extends Factory
{
    protected $model = AttendanceRecord::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'attendance_session_id' => AttendanceSession::factory(),
            'student_id' => Student::factory(),
            'status' => fake()->randomElement(['present', 'absent', 'late', 'excused']),
            'remarks' => fake()->optional()->sentence(),
        ];
    }
}
