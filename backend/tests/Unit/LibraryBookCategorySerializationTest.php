<?php

namespace Tests\Unit;

use App\Models\LibraryBook;
use App\Models\LibraryCategory;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LibraryBookCategorySerializationTest extends TestCase
{
    #[Test]
    public function it_keeps_the_category_name_when_the_relation_is_null(): void
    {
        $book = new LibraryBook;
        $book->forceFill([
            'title' => 'آسانه صرف',
            'category' => 'د علم صرف کتابونه',
        ]);
        $book->setRelation('category', null);

        $this->assertSame('د علم صرف کتابونه', $book->toArray()['category']);
    }

    #[Test]
    public function it_exposes_the_loaded_category_name(): void
    {
        $category = new LibraryCategory;
        $category->forceFill([
            'id' => '11111111-1111-4111-8111-111111111111',
            'name' => 'الفقه',
        ]);

        $book = new LibraryBook;
        $book->forceFill([
            'title' => 'أصول الفقه',
            'category' => 'الفقه',
            'category_id' => $category->id,
        ]);
        $book->setRelation('category', $category);

        $payload = $book->toArray();

        $this->assertIsArray($payload['category']);
        $this->assertSame('الفقه', $payload['category']['name']);
        $this->assertSame($category->id, $payload['category_id']);
    }
}
