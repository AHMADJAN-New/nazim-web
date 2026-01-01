<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class HelpCenterArticleVote extends Model
{
    use HasFactory;

    protected $connection = 'pgsql';
    protected $table = 'help_center_article_votes';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'article_id',
        'user_id',
        'session_id',
        'vote_type',
    ];

    protected $casts = [
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

    /**
     * Get the article
     */
    public function article()
    {
        return $this->belongsTo(HelpCenterArticle::class, 'article_id');
    }

    /**
     * Get the user (if authenticated)
     */
    public function user()
    {
        return $this->belongsTo(Profile::class, 'user_id');
    }
}
