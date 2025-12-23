<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EventGuestFieldValue extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'event_guest_field_values';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'guest_id',
        'field_id',
        'value_text',
        'value_json',
    ];

    protected $casts = [
        'value_json' => 'array',
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
     * Get the guest that owns this field value
     */
    public function guest()
    {
        return $this->belongsTo(EventGuest::class, 'guest_id');
    }

    /**
     * Get the field definition for this value
     */
    public function field()
    {
        return $this->belongsTo(EventTypeField::class, 'field_id');
    }

    /**
     * Get the appropriate value based on field type
     */
    public function getValueAttribute()
    {
        if ($this->value_json !== null) {
            return $this->value_json;
        }
        return $this->value_text;
    }

    /**
     * Set the value based on type
     */
    public function setValueAttribute($value)
    {
        if (is_array($value)) {
            $this->value_json = $value;
            $this->value_text = null;
        } else {
            $this->value_text = $value;
            $this->value_json = null;
        }
    }
}
