<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FinanceDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'finance_documents';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'document_type',
        'title',
        'description',
        'fee_collection_id',
        'student_id',
        'staff_id',
        'donor_id',
        'project_id',
        'income_entry_id',
        'expense_entry_id',
        'account_id',
        'amount',
        'reference_number',
        'document_date',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'file_size' => 'integer',
        'document_date' => 'date',
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
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    public function feeCollection()
    {
        return $this->belongsTo(FeeCollection::class, 'fee_collection_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function staff()
    {
        return $this->belongsTo(Staff::class, 'staff_id');
    }

    public function donor()
    {
        return $this->belongsTo(Donor::class, 'donor_id');
    }

    public function project()
    {
        return $this->belongsTo(FinanceProject::class, 'project_id');
    }

    public function incomeEntry()
    {
        return $this->belongsTo(IncomeEntry::class, 'income_entry_id');
    }

    public function expenseEntry()
    {
        return $this->belongsTo(ExpenseEntry::class, 'expense_entry_id');
    }

    public function account()
    {
        return $this->belongsTo(FinanceAccount::class, 'account_id');
    }

    public function uploadedBy()
    {
        return $this->belongsTo(Profile::class, 'uploaded_by');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('document_type', $type);
    }

    public function scopeForStudent($query, string $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeForStaff($query, string $staffId)
    {
        return $query->where('staff_id', $staffId);
    }

    public function scopeForDonor($query, string $donorId)
    {
        return $query->where('donor_id', $donorId);
    }

    public function scopeForProject($query, string $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeForIncomeEntry($query, string $incomeEntryId)
    {
        return $query->where('income_entry_id', $incomeEntryId);
    }

    public function scopeForExpenseEntry($query, string $expenseEntryId)
    {
        return $query->where('expense_entry_id', $expenseEntryId);
    }

    public function scopeForAccount($query, string $accountId)
    {
        return $query->where('account_id', $accountId);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('document_date', [$startDate, $endDate]);
    }
}

