<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Services\CodeGenerator;

class Staff extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'staff';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'profile_id',
        'organization_id',
        'employee_id',
        'staff_code',
        'staff_type',
        'staff_type_id',
        'school_id',
        'first_name',
        'father_name',
        'grandfather_name',
        'tazkira_number',
        'birth_year',
        'birth_date',
        'phone_number',
        'email',
        'home_address',
        'origin_province',
        'origin_district',
        'origin_village',
        'current_province',
        'current_district',
        'current_village',
        'religious_education',
        'religious_university',
        'religious_graduation_year',
        'religious_department',
        'modern_education',
        'modern_school_university',
        'modern_graduation_year',
        'modern_department',
        'teaching_section',
        'position',
        'duty',
        'salary',
        'status',
        'picture_url',
        'document_urls',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'document_urls' => 'array',
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
            
            // Generate staff_code if not provided and organization_id exists
            if (empty($model->staff_code) && !empty($model->organization_id)) {
                $model->staff_code = CodeGenerator::generateStaffCode($model->organization_id);
            }
        });
    }

    /**
     * Get the profile associated with the staff member
     */
    public function profile()
    {
        return $this->belongsTo(Profile::class, 'profile_id', 'id');
    }

    /**
     * Get the organization that owns the staff member
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the staff type
     */
    public function staffType()
    {
        return $this->belongsTo(StaffType::class, 'staff_type_id');
    }

    /**
     * Get all documents for this staff member
     */
    public function documents()
    {
        return $this->hasMany(StaffDocument::class, 'staff_id');
    }

    /**
     * Get the user who created this staff record
     */
    public function createdBy()
    {
        return $this->belongsTo(Profile::class, 'created_by', 'id');
    }

    /**
     * Get the user who last updated this staff record
     */
    public function updatedBy()
    {
        return $this->belongsTo(Profile::class, 'updated_by', 'id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter active staff
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to filter by staff type
     */
    public function scopeByType($query, $staffTypeId)
    {
        return $query->where('staff_type_id', $staffTypeId);
    }
}

