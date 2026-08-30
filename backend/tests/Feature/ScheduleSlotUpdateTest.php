<?php

namespace Tests\Feature;

use App\Http\Requests\UpdateScheduleSlotRequest;
use App\Models\Organization;
use App\Models\ScheduleSlot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class ScheduleSlotUpdateTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    #[Test]
    public function update_schedule_slot_request_does_not_allow_organization_id(): void
    {
        $rules = (new UpdateScheduleSlotRequest)->rules();

        $this->assertArrayNotHasKey('organization_id', $rules);
        $this->assertArrayNotHasKey('school_id', $rules);
    }

    #[Test]
    public function schedule_slot_update_ignores_organization_id_in_payload(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $otherOrganization = Organization::factory()->create();

        $slot = ScheduleSlot::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Period 1',
            'code' => 'P1',
            'start_time' => '08:00:00',
            'end_time' => '08:45:00',
            'days_of_week' => ['monday'],
            'default_duration_minutes' => 45,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/schedule-slots/{$slot->id}", [
            'name' => 'Period One Updated',
            'organization_id' => $otherOrganization->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Period One Updated')
            ->assertJsonPath('organization_id', $organization->id)
            ->assertJsonPath('school_id', $school->id);

        $slot->refresh();
        $this->assertSame($organization->id, $slot->organization_id);
        $this->assertSame($school->id, $slot->school_id);
        $this->assertSame('Period One Updated', $slot->name);
    }
}
