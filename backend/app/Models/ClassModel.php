<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ClassModel extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'classes';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'name',
        'code',
        'grade_level',
        'description',
        'default_capacity',
        'is_active',
    ];

    protected $casts = [
        'grade_level' => 'integer',
        'default_capacity' => 'integer',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
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

    /**
     * Get the organization that owns the class
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school that owns the class
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get all class academic year instances
     */
    public function classAcademicYears()
    {
        return $this->hasMany(ClassAcademicYear::class, 'class_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        if (!$organizationId) {
            return $query->whereRaw('1=0');
        }
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter active classes
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

