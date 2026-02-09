<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SchoolAdmissionRules extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'school_admission_rules';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'school_id',
        'commitment_items',
        'guarantee_text',
        'labels',
    ];

    protected $casts = [
        'commitment_items' => 'array',
        'labels' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Default section labels for the rules page (student profile PDF), in Pashto.
     */
    public static function defaultLabels(): array
    {
        return [
            'commitments_title' => 'تعهدات، ضمانت، او تائید',
            'commitment_title' => 'تعهد نامه',
            'guarantee_title' => 'ضمانت نامه',
            'approval_title' => 'تائيد نامه',
            'signature' => 'امضا',
            'guarantor_signature' => 'د ضامن لاسلیک',
            'approval_admission' => 'د داخلې ناظم له لوري مذکور طالب العلم ته په درجه',
            'was_admitted' => 'کې داخله ورکړل شوه.',
            'approval_fee' => 'داخله فيس:',
            'approval_date' => 'د داخلې تاريخ:',
            'approval_signature' => 'د ناظم لاسليک:',
            'stamp' => 'مهر',
        ];
    }

    /**
     * Default commitment items (تعهد نامه) in Pashto, used when no rules row exists.
     */
    public static function defaultCommitmentItems(): array
    {
        return [
            'د مدرسې ټول قوانين به په ځان عملي کوم',
            'د مدرسې د قوانينو سر بېره به شرعي قوانين هم په ځان تطبيقوم',
            'د مدرسې د ټولو استاذانو او اراکينو به احترام کوم او د مدرسې د ټولو شتمنيو به ساتنه کوم',
            'له قانون څخه د سرغړونې او يا د غير حاضري په صورت کې د ادارې هر ډول پرېکړه منم او په ځان به يې تطبيقوم',
            'د کوچني او لوی مبایل په اړه به د مدرسې قانون ته غاړه ږدم، د مخالفت په صورت کې مدرسه زما داخراج یا د مبایل د ضبط حق لري.',
            'د مدرسې مهتمم يا د هغه نائب په زکوة، صدقه او ورته خيريه چارو کې خپل وکيل ګرځوم',
        ];
    }

    /**
     * Default guarantee text (ضمانت نامه) in Pashto, used when no rules row exists.
     */
    public static function defaultGuaranteeText(): string
    {
        return 'ذکر شوي شرائط او ضوابط زما د علم مطابق سم دي؛ لهذا ته مدرسه کې په داخله ورکولو باندې راضي یم او ضمانت درکوم چې مذکور طالب العلم به د مدرسې ټولو قوانينو ته پابند اوسيږي، د مخالفت په صورت کې د مدرسې هر ډول پرېکړه ماته منظوره ده.';
    }

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
     * Get the school that owns these admission rules
     */
    public function school()
    {
        return $this->belongsTo(SchoolBranding::class, 'school_id');
    }

    /**
     * Get the organization that owns these admission rules
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}
