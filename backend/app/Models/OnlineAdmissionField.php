<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OnlineAdmissionField extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'online_admission_fields';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'key',
        'label',
        'field_type',
        'is_required',
        'is_enabled',
        'sort_order',
        'placeholder',
        'help_text',
        'validation_rules',
        'options',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_enabled' => 'boolean',
        'sort_order' => 'integer',
        'validation_rules' => 'array',
        'options' => 'array',
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

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function fieldValues()
    {
        return $this->hasMany(OnlineAdmissionFieldValue::class, 'field_id');
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }
}
