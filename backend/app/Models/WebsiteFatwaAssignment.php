<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class WebsiteFatwaAssignment extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'website_fatwa_assignments';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'fatwa_question_id',
        'assigned_to',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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
}
