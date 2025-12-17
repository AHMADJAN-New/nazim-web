<?php

namespace Tests\Unit;

use App\Models\FeeAssignment;
use Tests\TestCase;

class FeeAssignmentTest extends TestCase
{
    public function test_calculates_remaining_and_sets_paid_status(): void
    {
        $assignment = new FeeAssignment([
            'assigned_amount' => 100,
            'paid_amount' => 100,
            'status' => 'pending',
        ]);

        $assignment->calculateRemainingAmount();
        $assignment->updateStatus();

        $this->assertSame(0.0, (float) $assignment->remaining_amount);
        $this->assertSame('paid', $assignment->status);
    }

    public function test_sets_partial_status_when_not_fully_paid(): void
    {
        $assignment = new FeeAssignment([
            'assigned_amount' => 200,
            'paid_amount' => 50,
            'status' => 'pending',
        ]);

        $assignment->calculateRemainingAmount();
        $assignment->updateStatus();

        $this->assertSame(150.0, (float) $assignment->remaining_amount);
        $this->assertSame('partial', $assignment->status);
    }

    public function test_apply_exception_updates_assigned_and_remaining(): void
    {
        $assignment = new FeeAssignment([
            'original_amount' => 1000,
            'assigned_amount' => 1000,
            'paid_amount' => 0,
            'status' => 'pending',
        ]);

        $assignment->applyException('discount_percentage', 50, 'Scholarship', 'user-1');

        $this->assertSame(500.0, (float) $assignment->assigned_amount);
        $this->assertSame(500.0, (float) $assignment->remaining_amount);
        $this->assertSame('pending', $assignment->status);
    }
}

