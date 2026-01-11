<?php

namespace Database\Factories;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AttendanceRecordFactory extends Factory
{
    protected $model = AttendanceRecord::class;

    public function definition(): array
    {
        $session = AttendanceSession::factory()->create();

        return [
            'id' => (string) Str::uuid(),
            'attendance_session_id' => $session->id,
            'organization_id' => $session->organization_id,
            'school_id' => $session->school_id,
            'student_id' => Student::factory()->state([
                'organization_id' => $session->organization_id,
                'school_id' => $session->school_id
            ]),
            'status' => fake()->randomElement(['present', 'absent', 'late', 'excused']),
            'entry_method' => 'manual',
            'marked_by' => User::factory(),
            'note' => fake()->optional()->sentence(),
        ];
    }
}
