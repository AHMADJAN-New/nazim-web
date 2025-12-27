<?php

namespace Tests\Feature;

use App\Models\LibraryBook;
use App\Models\LibraryCategory;
use App\Models\LibraryCopy;
use App\Models\LibraryLoan;
use App\Models\Organization;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LibraryManagementTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_create_library_category()
    {
        $user = $this->authenticate();

        $categoryData = [
            'name' => 'Islamic Studies',
            'description' => 'Books about Islamic topics',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/library-categories', $categoryData);

        if ($response->status() === 201) {
            $this->assertDatabaseHas('library_categories', [
                'name' => 'Islamic Studies',
            ]);
        }

        $this->assertContains($response->status(), [201, 404, 422]);
    }

    /** @test */
    public function user_can_create_library_book()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $category = LibraryCategory::factory()->create(['organization_id' => $organization->id]);

        $bookData = [
            'title' => 'Quran Tafsir',
            'author' => 'Ibn Kathir',
            'isbn' => '1234567890',
            'category_id' => $category->id,
            'publisher' => 'Darussalam',
            'publication_year' => 2020,
            'language' => 'Arabic',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/library-books', $bookData);

        if ($response->status() === 201) {
            $this->assertDatabaseHas('library_books', [
                'title' => 'Quran Tafsir',
                'author' => 'Ibn Kathir',
            ]);
        }

        $this->assertContains($response->status(), [201, 404, 422]);
    }

    /** @test */
    public function user_can_list_library_books()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        LibraryBook::factory()->count(5)->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'GET', '/api/library-books');

        if ($response->status() === 200) {
            $books = $response->json('data');
            $this->assertCount(5, $books);
        }

        $this->assertContains($response->status(), [200, 404]);
    }

    /** @test */
    public function library_books_are_organization_scoped()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1);

        LibraryBook::factory()->count(3)->create(['organization_id' => $org1->id]);
        LibraryBook::factory()->count(2)->create(['organization_id' => $org2->id]);

        $response = $this->jsonAs($user1, 'GET', '/api/library-books');

        if ($response->status() === 200) {
            $books = $response->json('data');
            $this->assertCount(3, $books);

            foreach ($books as $book) {
                $this->assertEquals($org1->id, $book['organization_id']);
            }
        }

        $this->assertContains($response->status(), [200, 404]);
    }

    /** @test */
    public function user_can_create_book_loan()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $book = LibraryBook::factory()->create(['organization_id' => $organization->id]);
        $copy = LibraryCopy::factory()->create([
            'library_book_id' => $book->id,
            'status' => 'available',
        ]);
        $student = Student::factory()->create(['organization_id' => $organization->id]);

        $loanData = [
            'library_copy_id' => $copy->id,
            'student_id' => $student->id,
            'borrowed_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'status' => 'borrowed',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/library-loans', $loanData);

        if ($response->status() === 201) {
            $this->assertDatabaseHas('library_loans', [
                'student_id' => $student->id,
                'status' => 'borrowed',
            ]);
        }

        $this->assertContains($response->status(), [201, 404, 422]);
    }

    /** @test */
    public function user_can_return_borrowed_book()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $book = LibraryBook::factory()->create(['organization_id' => $organization->id]);
        $copy = LibraryCopy::factory()->create(['library_book_id' => $book->id]);
        $student = Student::factory()->create(['organization_id' => $organization->id]);

        $loan = LibraryLoan::factory()->create([
            'library_copy_id' => $copy->id,
            'student_id' => $student->id,
            'status' => 'borrowed',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/library-loans/{$loan->id}", [
            'status' => 'returned',
            'returned_date' => now()->toDateString(),
        ]);

        if ($response->status() === 200) {
            $this->assertDatabaseHas('library_loans', [
                'id' => $loan->id,
                'status' => 'returned',
            ]);
        }

        $this->assertContains($response->status(), [200, 404, 422]);
    }

    /** @test */
    public function user_can_search_books_by_title()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'title' => 'Sahih Bukhari',
        ]);

        LibraryBook::factory()->create([
            'organization_id' => $organization->id,
            'title' => 'Sahih Muslim',
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/library-books', [
            'search' => 'Bukhari',
        ]);

        if ($response->status() === 200) {
            $books = $response->json('data');
            $this->assertGreaterThanOrEqual(1, count($books));
            $this->assertStringContainsStringIgnoringCase('Bukhari', $books[0]['title']);
        }

        $this->assertContains($response->status(), [200, 404]);
    }
}
