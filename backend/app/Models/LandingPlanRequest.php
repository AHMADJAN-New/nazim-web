<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class LandingPlanRequest extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'landing_plan_requests';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'requested_plan_id',
        'organization_name',
        'school_name',
        'school_page_url',
        'contact_name',
        'contact_email',
        'contact_phone',
        'contact_position',
        'number_of_schools',
        'student_count',
        'staff_count',
        'city',
        'country',
        'message',
    ];

    protected $casts = [
        'number_of_schools' => 'integer',
        'student_count' => 'integer',
        'staff_count' => 'integer',
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
