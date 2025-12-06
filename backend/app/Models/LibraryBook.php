<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LibraryBook extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'title',
        'author',
        'isbn',
        'category',
        'category_id',
        'volume',
        'description',
        'deposit_amount',
        'default_loan_days',
    ];

    public function copies()
    {
        return $this->hasMany(LibraryCopy::class, 'book_id');
    }

    public function loans()
    {
        return $this->hasMany(LibraryLoan::class, 'book_id');
    }

    /**
     * Get the category that owns the book
     */
    public function category()
    {
        return $this->belongsTo(LibraryCategory::class, 'category_id');
    }
}
