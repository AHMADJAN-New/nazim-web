<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OnlineAdmissionFieldValue extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'online_admission_field_values';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'online_admission_id',
        'field_id',
        'value_text',
        'value_json',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
    ];

    protected $casts = [
        'value_json' => 'array',
        'file_size' => 'integer',
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

    public function admission()
    {
        return $this->belongsTo(OnlineAdmission::class, 'online_admission_id');
    }

    public function field()
    {
        return $this->belongsTo(OnlineAdmissionField::class, 'field_id');
    }

    public function getValueAttribute()
    {
        if ($this->value_json !== null) {
            return $this->value_json;
        }
        return $this->value_text;
    }

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
