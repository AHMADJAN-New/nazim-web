<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FeeAssignment extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'fee_assignments';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'student_id',
        'student_admission_id',
        'fee_structure_id',
        'academic_year_id',
        'class_academic_year_id',
        'original_amount',
        'assigned_amount',
        'currency_id',
        'exception_type',
        'exception_amount',
        'exception_reason',
        'exception_approved_by',
        'exception_approved_at',
        'payment_period_start',
        'payment_period_end',
        'due_date',
        'status',
        'paid_amount',
        'remaining_amount',
        'notes',
    ];

    protected $casts = [
        'original_amount' => 'decimal:2',
        'assigned_amount' => 'decimal:2',
        'exception_amount' => 'decimal:2',
        'payment_period_start' => 'date',
        'payment_period_end' => 'date',
        'due_date' => 'date',
        'paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'exception_approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            // Default remaining to assigned amount if not provided
            if ($model->remaining_amount === null) {
                $model->remaining_amount = $model->assigned_amount;
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

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function studentAdmission()
    {
        return $this->belongsTo(StudentAdmission::class, 'student_admission_id');
    }

    public function feeStructure()
    {
        return $this->belongsTo(FeeStructure::class, 'fee_structure_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function classAcademicYear()
    {
        return $this->belongsTo(ClassAcademicYear::class, 'class_academic_year_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function exceptionApprovedBy()
    {
        return $this->belongsTo(User::class, 'exception_approved_by');
    }

    public function feePayments()
    {
        return $this->hasMany(FeePayment::class, 'fee_assignment_id');
    }

    public function feeExceptions()
    {
        return $this->hasMany(FeeException::class, 'fee_assignment_id');
    }

    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeForStudentAdmission($query, string $studentAdmissionId)
    {
        return $query->where('student_admission_id', $studentAdmissionId);
    }

    public function calculateRemainingAmount(): void
    {
        $this->remaining_amount = max(0, (float) $this->assigned_amount - (float) $this->paid_amount);
    }

    public function updateStatus(): void
    {
        if (in_array($this->status, ['waived', 'cancelled'], true)) {
            return;
        }

        if ((float) $this->remaining_amount <= 0) {
            $this->status = 'paid';
            $this->remaining_amount = 0;
        } elseif ((float) $this->paid_amount > 0) {
            $this->status = 'partial';
        } elseif ($this->due_date && $this->due_date->isPast()) {
            $this->status = 'overdue';
        } else {
            $this->status = 'pending';
        }
    }

    public function applyException(string $type, float $amount, ?string $reason = null, ?string $approvedBy = null, ?string $approvedAt = null): void
    {
        $this->exception_type = $type;
        $this->exception_amount = $amount;
        $this->exception_reason = $reason;
        $this->exception_approved_by = $approvedBy;
        $this->exception_approved_at = $approvedAt ? Carbon::parse($approvedAt) : now();

        $this->assigned_amount = max(0, (float) $this->original_amount - $this->resolveExceptionDeduction($type, $amount));
        $this->calculateRemainingAmount();
        $this->updateStatus();
    }

    protected function resolveExceptionDeduction(string $type, float $amount): float
    {
        if ($type === 'discount_percentage') {
            return ((float) $this->original_amount) * ($amount / 100);
        }

        if (in_array($type, ['discount_fixed', 'waiver', 'custom'], true)) {
            return $amount;
        }

        return 0;
    }

    public function syncPaymentTotals(): void
    {
        $totals = $this->feePayments()->whereNull('deleted_at')->selectRaw('COALESCE(SUM(amount),0) as total_paid')->first();
        $this->paid_amount = (float) ($totals?->total_paid ?? 0);
        $this->calculateRemainingAmount();
        $this->updateStatus();
        $this->save();
    }

    public function refreshTotalsWithinTransaction(): void
    {
        DB::transaction(function () {
            $this->syncPaymentTotals();
        });
    }
}

