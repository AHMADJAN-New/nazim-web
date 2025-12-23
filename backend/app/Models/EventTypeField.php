<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EventTypeField extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'event_type_fields';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'event_type_id',
        'field_group_id',
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
     * Get the event type that owns this field
     */
    public function eventType()
    {
        return $this->belongsTo(EventType::class, 'event_type_id');
    }

    /**
     * Get the field group that contains this field
     */
    public function fieldGroup()
    {
        return $this->belongsTo(EventTypeFieldGroup::class, 'field_group_id');
    }

    /**
     * Get the field values for this field
     */
    public function fieldValues()
    {
        return $this->hasMany(EventGuestFieldValue::class, 'field_id');
    }

    /**
     * Scope to filter enabled fields
     */
    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    /**
     * Scope to filter required fields
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }
}
