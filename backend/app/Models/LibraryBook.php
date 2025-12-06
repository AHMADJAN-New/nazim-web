<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class LibraryBook extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'title',
        'author',
        'isbn',
        'book_number',
        'category',
        'category_id',
        'volume',
        'description',
        'price',
        'default_loan_days',
    ];

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

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
