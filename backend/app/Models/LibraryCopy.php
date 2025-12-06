<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LibraryCopy extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'book_id',
        'copy_code',
        'status',
        'acquired_at',
    ];

    public function book()
    {
        return $this->belongsTo(LibraryBook::class, 'book_id');
    }

    public function loans()
    {
        return $this->hasMany(LibraryLoan::class, 'book_copy_id');
    }
}
