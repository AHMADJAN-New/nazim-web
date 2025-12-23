<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ReportRun extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'report_runs';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'branding_id',
        'layout_id',
        'watermark_id',
        'user_id',
        'report_key',
        'report_type',
        'template_name',
        'title',
        'notes_snapshot',
        'page_settings',
        'parameters',
        'column_config',
        'output_path',
        'file_name',
        'file_size_bytes',
        'status',
        'progress',
        'error_message',
        'duration_ms',
        'generated_by',
        'row_count',
    ];

    protected $casts = [
        'notes_snapshot' => 'array',
        'page_settings' => 'array',
        'parameters' => 'array',
        'column_config' => 'array',
        'file_size_bytes' => 'integer',
        'progress' => 'integer',
        'duration_ms' => 'integer',
        'row_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';

    // Type constants
    const TYPE_PDF = 'pdf';
    const TYPE_EXCEL = 'excel';

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
     * Get the organization that owns this report run
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the school branding used for this report
     */
    public function branding()
    {
        return $this->belongsTo(SchoolBranding::class, 'branding_id');
    }

    /**
     * Get the layout used for this report
     */
    public function layout()
    {
        return $this->belongsTo(BrandingLayout::class, 'layout_id');
    }

    /**
     * Get the watermark used for this report
     */
    public function watermark()
    {
        return $this->belongsTo(BrandingWatermark::class, 'watermark_id');
    }

    /**
     * Get the user who generated this report
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope to filter by organization
     */
    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Scope to filter by status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter pending reports
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to filter processing reports
     */
    public function scopeProcessing($query)
    {
        return $query->where('status', self::STATUS_PROCESSING);
    }

    /**
     * Scope to filter completed reports
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope to filter failed reports
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Check if report is pending
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if report is processing
     */
    public function isProcessing(): bool
    {
        return $this->status === self::STATUS_PROCESSING;
    }

    /**
     * Check if report is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if report is failed
     */
    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Mark as processing
     */
    public function markProcessing(): void
    {
        $this->update([
            'status' => self::STATUS_PROCESSING,
            'progress' => 0,
        ]);
    }

    /**
     * Update progress
     */
    public function updateProgress(int $progress, ?string $message = null): void
    {
        $data = ['progress' => min(100, max(0, $progress))];
        if ($message) {
            $data['error_message'] = $message;
        }
        $this->update($data);
    }

    /**
     * Mark as completed
     */
    public function markCompleted(string $outputPath, string $fileName, int $fileSize, int $durationMs): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'progress' => 100,
            'output_path' => $outputPath,
            'file_name' => $fileName,
            'file_size_bytes' => $fileSize,
            'duration_ms' => $durationMs,
            'error_message' => null,
        ]);
    }

    /**
     * Mark as failed
     */
    public function markFailed(string $errorMessage, int $durationMs = 0): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $errorMessage,
            'duration_ms' => $durationMs,
        ]);
    }

    /**
     * Get MIME type based on report type
     */
    public function getMimeType(): string
    {
        return match ($this->report_type) {
            self::TYPE_PDF => 'application/pdf',
            self::TYPE_EXCEL => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            default => 'application/octet-stream',
        };
    }

    /**
     * Get file extension based on report type
     */
    public function getFileExtension(): string
    {
        return match ($this->report_type) {
            self::TYPE_PDF => 'pdf',
            self::TYPE_EXCEL => 'xlsx',
            default => 'bin',
        };
    }
}
