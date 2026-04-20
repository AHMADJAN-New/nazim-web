<?php

namespace Tests\Unit;

use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Spatie\Activitylog\Contracts\Activity as ActivityContract;
use Tests\TestCase;

class ActivityLogServiceTest extends TestCase
{
    public function test_log_event_accepts_subject_named_argument(): void
    {
        $request = Request::create('/api/student-id-cards/card-1/mark-printed', 'POST');
        $subject = (object) ['id' => 'card-1'];

        $service = $this->partialMock(ActivityLogService::class, function ($mock) use ($request, $subject) {
            $mock->shouldReceive('log')
                ->once()
                ->withArgs(function (
                    string $description,
                    ?string $logName,
                    $receivedSubject,
                    ?string $event,
                    ?array $properties,
                    ?Request $receivedRequest
                ) use ($request, $subject) {
                    return $description === 'Marked ID card as printed'
                        && $logName === null
                        && $receivedSubject === $subject
                        && $event === null
                        && $properties === ['card_id' => 'card-1']
                        && $receivedRequest === $request;
                })
                ->andReturn(\Mockery::mock(ActivityContract::class));
        });

        $service->logEvent(
            description: 'Marked ID card as printed',
            properties: ['card_id' => 'card-1'],
            request: $request,
            subject: $subject
        );
    }
}
