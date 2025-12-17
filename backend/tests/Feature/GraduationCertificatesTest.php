<?php

namespace Tests\Feature;

use Tests\TestCase;

class GraduationCertificatesTest extends TestCase
{
    public function test_verify_endpoint_returns_not_found_for_invalid_hash(): void
    {
        $response = $this->getJson('/api/verify/certificate/not-a-real-hash');
        $response->assertStatus(404);
    }

    public function test_graduation_batch_creation_requires_authentication(): void
    {
        $response = $this->postJson('/api/graduation/batches', []);
        $response->assertStatus(401);
    }
}
