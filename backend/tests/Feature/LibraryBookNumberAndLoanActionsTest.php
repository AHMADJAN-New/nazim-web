<?php

namespace Tests\Feature;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Models\LibraryLoan;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Services\Library\LibraryBookNumberService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class LibraryBookNumberAndLoanActionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_next_number_ignores_non_numeric_values_and_uses_the_highest_serial(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'book_number' => '7',
        ]);
        LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'book_number' => 'BK-99',
        ]);

        $next = app(LibraryBookNumberService::class)->nextNumber($organization->id, $school->id);

        $this->assertSame('8', $next);
    }

    public function test_the_same_serial_can_exist_in_two_schools_but_not_twice_in_one(): void
    {
        $organization = Organization::factory()->create();
        $schoolA = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $schoolB = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
            'book_number' => '1',
        ]);
        LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
            'book_number' => '1',
        ]);

        $this->expectException(QueryException::class);

        LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
            'book_number' => '1',
        ]);
    }

    public function test_deleting_an_open_loan_returns_the_copy_to_available(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        setPermissionsTeamId($organization->id);
        $user->givePermissionTo(Permission::firstOrCreate([
            'name' => 'library_loans.update',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'library_loans',
            'action' => 'update',
            'description' => 'Update library loans',
        ]));
        setPermissionsTeamId(null);

        $book = LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'book_number' => '4',
        ]);
        $copy = LibraryCopy::factory()->create([
            'book_id' => $book->id,
            'school_id' => $school->id,
            'status' => 'loaned',
        ]);
        $loan = LibraryLoan::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'book_id' => $book->id,
            'book_copy_id' => $copy->id,
            'returned_at' => null,
        ]);

        $response = $this->jsonAs($user, 'DELETE', '/api/library-loans/'.$loan->id);

        $response->assertNoContent();
        $this->assertSoftDeleted('library_loans', ['id' => $loan->id]);
        $this->assertDatabaseHas('library_copies', [
            'id' => $copy->id,
            'status' => 'available',
        ]);
    }
}
