<?php

namespace Tests\Unit;

use App\Models\Grade;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GradeModelTest extends TestCase
{
    #[Test]
    public function it_keeps_the_tenant_and_school_ids_when_mass_assigned(): void
    {
        $grade = new Grade([
            'organization_id' => '11111111-1111-4111-8111-111111111111',
            'school_id' => '22222222-2222-4222-8222-222222222222',
            'name_en' => 'A',
            'name_ar' => 'A',
            'name_ps' => 'A',
            'name_fa' => 'A',
            'min_percentage' => 80,
            'max_percentage' => 100,
            'order' => 1,
            'is_pass' => true,
        ]);

        $this->assertSame('11111111-1111-4111-8111-111111111111', $grade->organization_id);
        $this->assertSame('22222222-2222-4222-8222-222222222222', $grade->school_id);
    }
}
