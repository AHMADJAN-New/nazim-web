<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FeePayment extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'fee_payments';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'fee_assignment_id',
        'student_id',
        'student_admission_id',
        'amount',
        'currency_id',
        'payment_date',
        'payment_method',
        'reference_no',
        'account_id',
        'income_entry_id',
        'received_by_user_id',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
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
        });

        static::created(function (FeePayment $payment) {
            DB::transaction(function () use ($payment) {
                $payment->createIncomeEntry();
                $payment->updateFeeAssignment();
            });
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

    public function feeAssignment()
    {
        return $this->belongsTo(FeeAssignment::class, 'fee_assignment_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function studentAdmission()
    {
        return $this->belongsTo(StudentAdmission::class, 'student_admission_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function account()
    {
        return $this->belongsTo(FinanceAccount::class, 'account_id');
    }

    public function incomeEntry()
    {
        return $this->belongsTo(IncomeEntry::class, 'income_entry_id');
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }

    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function createIncomeEntry(): void
    {
        if ($this->income_entry_id) {
            return;
        }

        $feeAssignment = $this->feeAssignment()->with(['feeStructure'])->first();
        $feeStructureName = $feeAssignment?->feeStructure?->name ?? 'Fee';

        // Resolve Student Fees category for the organization
        $incomeCategory = IncomeCategory::whereNull('deleted_at')
            ->where('organization_id', $this->organization_id)
            ->where(function ($query) {
                $query->where('code', 'TUITION')
                    ->orWhere('name', 'Tuition Fees')
                    ->orWhere('name', 'Student Fees');
            })
            ->first();

        if (!$incomeCategory) {
            $incomeCategory = IncomeCategory::create([
                'organization_id' => $this->organization_id,
                'name' => 'Tuition Fees',
                'code' => 'TUITION',
                'description' => 'Default category for student fee payments',
                'is_restricted' => false,
                'is_active' => true,
                'display_order' => 1,
            ]);
        }

        $incomeEntry = IncomeEntry::create([
            'organization_id' => $this->organization_id,
            'school_id' => $this->school_id,
            'currency_id' => $this->currency_id,
            'account_id' => $this->account_id,
            'income_category_id' => $incomeCategory->id,
            'project_id' => null,
            'donor_id' => null,
            'amount' => $this->amount,
            'date' => $this->payment_date,
            'reference_no' => $this->reference_no,
            'description' => "Fee payment for {$feeStructureName}",
            'received_by_user_id' => $this->received_by_user_id,
            'payment_method' => $this->payment_method,
        ]);

        $this->income_entry_id = $incomeEntry->id;
        $this->save();
    }

    public function updateFeeAssignment(): void
    {
        $assignment = $this->feeAssignment()->first();

        if (!$assignment) {
            return;
        }

        $assignment->refreshTotalsWithinTransaction();
    }
}

