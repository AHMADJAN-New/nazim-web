<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class DesktopLicense extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'desktop_licenses';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'kid',
        'customer',
        'edition',
        'expires',
        'issued_at',
        'validity_days',
        'seats',
        'notes',
        'fingerprint_id',
        'payload_b64',
        'signature_b64',
        'license_file_path',
    ];

    protected $casts = [
        'expires' => 'datetime',
        'issued_at' => 'datetime',
        'validity_days' => 'integer',
        'seats' => 'integer',
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
     * Get the license key used for signing
     */
    public function licenseKey()
    {
        return $this->belongsTo(LicenseKey::class, 'kid', 'kid');
    }

    /**
     * Get the license JSON structure
     */
    public function getLicenseJson(): array
    {
        return [
            'payload' => $this->payload_b64,
            'signature' => $this->signature_b64,
        ];
    }

    /**
     * Get the decoded payload
     */
    public function getDecodedPayload(): array
    {
        if (empty($this->payload_b64)) {
            return [];
        }

        $decoded = base64_decode($this->payload_b64, true);
        if ($decoded === false) {
            return [];
        }

        $json = json_decode($decoded, true);
        return is_array($json) ? $json : [];
    }

    /**
     * Download license as .dat file
     */
    public function downloadAsDat(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $licenseJson = json_encode($this->getLicenseJson(), JSON_PRETTY_PRINT);
        $filename = 'license_' . $this->id . '.dat';

        return response()->streamDownload(function () use ($licenseJson) {
            echo $licenseJson;
        }, $filename, [
            'Content-Type' => 'application/octet-stream',
        ]);
    }

    /**
     * Save license to file and return path
     */
    public function saveAsDatFile(): string
    {
        $licenseJson = json_encode($this->getLicenseJson(), JSON_PRETTY_PRINT);
        $filename = 'license_' . $this->id . '.dat';
        $path = 'licenses/' . $filename;

        Storage::disk('private')->put($path, $licenseJson);

        $this->license_file_path = $path;
        $this->save();

        return $path;
    }
}

