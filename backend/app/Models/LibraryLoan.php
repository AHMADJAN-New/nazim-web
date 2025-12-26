<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class LibraryLoan extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'book_id',
        'book_copy_id',
        'student_id',
        'staff_id',
        'assigned_by',
        'loan_date',
        'due_date',
        'returned_at',
        'deposit_amount',
        'fee_retained',
        'refunded',
        'notes',
    ];

    protected $casts = [
        'loan_date' => 'date',
        'due_date' => 'date',
        'returned_at' => 'date',
        'deposit_amount' => 'decimal:2',
        'fee_retained' => 'decimal:2',
        'refunded' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function copy()
    {
        return $this->belongsTo(LibraryCopy::class, 'book_copy_id');
    }

    public function book()
    {
        return $this->belongsTo(LibraryBook::class, 'book_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }
}
