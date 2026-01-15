<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class HelpCenterCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'help_center_categories';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'order',
        'is_active',
        'parent_id',
        'article_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
        'article_count' => 'integer',
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
            if (empty($model->slug)) {
                $model->slug = $model->generateUniqueSlug($model->name, $model->organization_id, $model->parent_id);
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name') && empty($model->slug)) {
                $model->slug = $model->generateUniqueSlug($model->name, $model->organization_id, $model->parent_id, $model->id);
            }
        });
    }

    /**
     * Get the organization that owns the category
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the parent category
     */
    public function parent()
    {
        return $this->belongsTo(HelpCenterCategory::class, 'parent_id');
    }

    /**
     * Get child categories
     */
    public function children()
    {
        return $this->hasMany(self::class, 'parent_id')
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->whereNull('organization_id')
            ->orderBy('order')
            ->orderBy('name');
    }

    /**
     * Recursive children (unlimited depth)
     */
    public function childrenRecursive()
    {
        return $this->children()->with('childrenRecursive');
    }

    /**
     * Get all articles in this category
     */
    public function articles()
    {
        return $this->hasMany(HelpCenterArticle::class, 'category_id')->whereNull('deleted_at');
    }

    /**
     * Get published articles in this category
     */
    public function publishedArticles()
    {
        return $this->hasMany(HelpCenterArticle::class, 'category_id')
            ->whereNull('deleted_at')
            ->where(function ($q) {
                // Backward compatibility: support both status and is_published
                $q->where('is_published', true)->orWhere('status', 'published');
            });
    }

    /**
     * Scope to get only active categories
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get root categories (no parent)
     */
    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Update article count
     */
    public function updateArticleCount()
    {
        $this->article_count = $this->publishedArticles()->count();
        $this->save();
    }

    /**
     * Get descendant IDs (category itself + all descendants)
     */
    public static function descendantIds(string $categoryId): array
    {
        $root = self::query()
            ->where('id', $categoryId)
            ->whereNull('organization_id')
            ->whereNull('deleted_at')
            ->with('childrenRecursive:id,parent_id')
            ->first();

        if (!$root) {
            return [$categoryId];
        }

        $ids = [];
        $walk = function ($node) use (&$walk, &$ids) {
            if (!$node) return;
            $ids[] = $node->id;
            foreach (($node->childrenRecursive ?? []) as $child) {
                $walk($child);
            }
        };

        $walk($root);

        return array_values(array_unique($ids));
    }

    /**
     * Generate unique slug for category
     * Slug must be unique per (organization_id, parent_id)
     */
    public function generateUniqueSlug($name, $organizationId = null, $parentId = null, $excludeId = null)
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug;
        $counter = 1;

        while (true) {
            $query = static::where('slug', $slug)
                ->where('organization_id', $organizationId)
                ->where('parent_id', $parentId)
                ->whereNull('deleted_at');

            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }

            if (!$query->exists()) {
                break;
            }

            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Scope to include global and organization categories
     */
    public function scopeForOrganization($query, $organizationId = null)
    {
        // All categories are global now (organization_id = NULL)
        return $query->whereNull('organization_id');
    }
}
