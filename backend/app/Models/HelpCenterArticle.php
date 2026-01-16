<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use HTMLPurifier;
use HTMLPurifier_Config;

class HelpCenterArticle extends Model
{
    use HasFactory, SoftDeletes;

    protected $connection = 'pgsql';
    protected $table = 'help_center_articles';

    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'organization_id',
        'category_id',
        'title',
        'slug',
        'excerpt',
        'content',
        'content_type',
        'language',
        'featured_image_url',
        'is_published', // Keep for backward compatibility
        'is_featured',
        'is_pinned',
        'status',
        'visibility',
        'context_key',
        'route_pattern',
        'meta_title',
        'meta_description',
        'tags',
        'view_count',
        'helpful_count',
        'not_helpful_count',
        'order',
        'author_id',
        'created_by',
        'updated_by',
        'related_article_ids',
        'published_at',
        'archived_at',
    ];

    protected $casts = [
        'is_published' => 'boolean', // Keep for backward compatibility
        'is_featured' => 'boolean',
        'is_pinned' => 'boolean',
        'tags' => 'array',
        'related_article_ids' => 'array',
        'view_count' => 'integer',
        'helpful_count' => 'integer',
        'not_helpful_count' => 'integer',
        'order' => 'integer',
        'published_at' => 'datetime',
        'archived_at' => 'datetime',
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
                $model->slug = $model->generateUniqueSlug($model->title, $model->organization_id, $model->category_id);
            }
            
            // Set status from is_published if status not set (backward compatibility)
            if (empty($model->status)) {
                $model->status = $model->is_published ? 'published' : 'draft';
            }
            
            // Set published_at if status is published
            if ($model->status === 'published' && empty($model->published_at)) {
                $model->published_at = now();
            }
            
            // Set created_by from author_id if not set
            if (empty($model->created_by) && $model->author_id) {
                $model->created_by = $model->author_id;
            }
            
            // Sanitize HTML content if content_type is html (only on create)
            if ($model->content_type === 'html' && !empty($model->content)) {
                $model->content = $model->sanitizeHtml($model->content);
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('title') && empty($model->slug)) {
                $model->slug = $model->generateUniqueSlug($model->title, $model->organization_id, $model->category_id, $model->id);
            }
            
            // Sync is_published with status (backward compatibility)
            if ($model->isDirty('status')) {
                $model->is_published = ($model->status === 'published');
            }
            if ($model->isDirty('is_published') && empty($model->status)) {
                $model->status = $model->is_published ? 'published' : 'draft';
            }
            
            // Set published_at if status changes to published
            if ($model->isDirty('status') && $model->status === 'published' && empty($model->published_at)) {
                $model->published_at = now();
            }
            
            // Set archived_at if status changes to archived
            if ($model->isDirty('status') && $model->status === 'archived' && empty($model->archived_at)) {
                $model->archived_at = now();
            }
            if ($model->isDirty('status') && $model->status !== 'archived') {
                $model->archived_at = null;
            }
            
            // Sanitize HTML content ONLY if content changed AND content_type is html
            // Do NOT re-sanitize unchanged content
            if ($model->isDirty('content') && $model->content_type === 'html' && !empty($model->content)) {
                $model->content = $model->sanitizeHtml($model->content);
            }
        });

        // Update category article count when article is created/updated/deleted
        static::saved(function ($model) {
            if ($model->category) {
                $model->category->updateArticleCount();
            }
        });

        static::deleted(function ($model) {
            if ($model->category) {
                $model->category->updateArticleCount();
            }
        });
    }

    /**
     * Generate unique slug for article
     * Slug must be unique per (organization_id, category_id)
     */
    public function generateUniqueSlug($title, $organizationId = null, $categoryId = null, $excludeId = null)
    {
        $baseSlug = Str::slug($title);
        $slug = $baseSlug;
        $counter = 1;

        while (true) {
            $query = static::where('slug', $slug)
                ->where('category_id', $categoryId)
                ->where(function ($q) use ($organizationId) {
                    if ($organizationId) {
                        $q->where('organization_id', $organizationId)
                            ->orWhereNull('organization_id');
                    } else {
                        $q->whereNull('organization_id');
                    }
                })
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
     * Sanitize HTML content using HTMLPurifier
     * Blocks: <script>, inline JS handlers, iframes (unless explicitly allowed)
     */
    public function sanitizeHtml($html)
    {
        $config = HTMLPurifier_Config::createDefault();
        $purifierConfig = config('help_center.html_purifier', []);
        
        // Set allowed tags (blocks script, iframe by default)
        $config->set('HTML.Allowed', $purifierConfig['allowed_tags'] ?? 'p,br,strong,em,u,ol,ul,li,a[href],h1,h2,h3,h4,h5,h6,blockquote,code,pre,img[src|alt|width|height],table,thead,tbody,tr,td,th');
        
        // Explicitly block script tags and inline event handlers
        $config->set('HTML.ForbiddenElements', ['script', 'iframe', 'object', 'embed']);
        $config->set('Attr.AllowedFrameTargets', []);
        $config->set('Attr.EnableID', false); // Disable IDs to prevent JS targeting
        
        // Block inline event handlers (onclick, onerror, etc.)
        $config->set('Attr.ForbiddenClasses', []);
        $config->set('CSS.AllowImportant', false);
        
        // Additional security: strip all javascript: URLs
        $config->set('URI.DisableExternalResources', false);
        $config->set('URI.DisableExternal', false);
        $config->set('URI.DisableResources', false);
        
        // Apply config options
        if ($purifierConfig['target_blank'] ?? true) {
            $config->set('HTML.TargetBlank', true);
        }
        if ($purifierConfig['auto_paragraph'] ?? true) {
            $config->set('AutoFormat.AutoParagraph', true);
        }
        if ($purifierConfig['linkify'] ?? true) {
            $config->set('AutoFormat.Linkify', true);
        }
        
        $purifier = new HTMLPurifier($config);
        return $purifier->purify($html);
    }

    /**
     * Get the organization that owns the article
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * Get the category this article belongs to
     */
    public function category()
    {
        return $this->belongsTo(HelpCenterCategory::class, 'category_id');
    }

    /**
     * Get the author of the article
     */
    public function author()
    {
        return $this->belongsTo(Profile::class, 'author_id');
    }

    /**
     * Get the user who created the article
     */
    public function creator()
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    /**
     * Get the user who last updated the article
     */
    public function updater()
    {
        return $this->belongsTo(Profile::class, 'updated_by');
    }

    /**
     * Get article views
     */
    public function views()
    {
        return $this->hasMany(HelpCenterArticleView::class, 'article_id');
    }

    /**
     * Get article votes
     */
    public function votes()
    {
        return $this->hasMany(HelpCenterArticleVote::class, 'article_id');
    }

    /**
     * Get related articles
     */
    public function relatedArticles()
    {
        if (empty($this->related_article_ids)) {
            return collect([]);
        }
        return HelpCenterArticle::whereIn('id', $this->related_article_ids)
            ->where('status', 'published')
            ->whereNull('deleted_at')
            ->get();
    }

    /**
     * Increment view count (with throttling via view tracking table)
     */
    public function incrementViewCount($userId = null, $sessionId = null)
    {
        $today = now()->toDateString();
        
        // Check if view already recorded today
        $viewRecord = HelpCenterArticleView::where('article_id', $this->id)
            ->where('view_date', $today)
            ->where(function ($q) use ($userId, $sessionId) {
                if ($userId) {
                    $q->where('user_id', $userId);
                } elseif ($sessionId) {
                    $q->where('session_id', $sessionId);
                }
            })
            ->first();

        if ($viewRecord) {
            // Increment count for same day
            $viewRecord->increment('view_count');
            $viewRecord->update(['last_viewed_at' => now()]);
        } else {
            // Create new view record
            HelpCenterArticleView::create([
                'article_id' => $this->id,
                'user_id' => $userId,
                'session_id' => $sessionId,
                'view_date' => $today,
                'first_viewed_at' => now(),
                'last_viewed_at' => now(),
            ]);
            
            // Increment article view count
            $this->increment('view_count');
        }
    }

    /**
     * Mark as helpful (with duplicate prevention)
     */
    public function markHelpful($userId = null, $sessionId = null)
    {
        // Check if user/session already voted
        $existingVote = HelpCenterArticleVote::where('article_id', $this->id)
            ->where(function ($q) use ($userId, $sessionId) {
                if ($userId) {
                    $q->where('user_id', $userId);
                } elseif ($sessionId) {
                    $q->where('session_id', $sessionId);
                }
            })
            ->first();

        if ($existingVote) {
            if ($existingVote->vote_type === 'helpful') {
                return false; // Already voted helpful
            }
            // Update existing vote
            $existingVote->update(['vote_type' => 'helpful']);
            $this->increment('helpful_count');
            if ($existingVote->vote_type === 'not_helpful') {
                $this->decrement('not_helpful_count');
            }
        } else {
            // Create new vote
            HelpCenterArticleVote::create([
                'article_id' => $this->id,
                'user_id' => $userId,
                'session_id' => $sessionId,
                'vote_type' => 'helpful',
            ]);
            $this->increment('helpful_count');
        }
        
        return true;
    }

    /**
     * Mark as not helpful (with duplicate prevention)
     */
    public function markNotHelpful($userId = null, $sessionId = null)
    {
        // Check if user/session already voted
        $existingVote = HelpCenterArticleVote::where('article_id', $this->id)
            ->where(function ($q) use ($userId, $sessionId) {
                if ($userId) {
                    $q->where('user_id', $userId);
                } elseif ($sessionId) {
                    $q->where('session_id', $sessionId);
                }
            })
            ->first();

        if ($existingVote) {
            if ($existingVote->vote_type === 'not_helpful') {
                return false; // Already voted not helpful
            }
            // Update existing vote
            $existingVote->update(['vote_type' => 'not_helpful']);
            $this->increment('not_helpful_count');
            if ($existingVote->vote_type === 'helpful') {
                $this->decrement('helpful_count');
            }
        } else {
            // Create new vote
            HelpCenterArticleVote::create([
                'article_id' => $this->id,
                'user_id' => $userId,
                'session_id' => $sessionId,
                'vote_type' => 'not_helpful',
            ]);
            $this->increment('not_helpful_count');
        }
        
        return true;
    }

    /**
     * Publish the article
     */
    public function publish()
    {
        $this->status = 'published';
        if (empty($this->published_at)) {
            $this->published_at = now();
        }
        $this->archived_at = null;
        $this->is_published = true;
        $this->save();
    }

    /**
     * Unpublish the article (back to draft)
     */
    public function unpublish()
    {
        $this->status = 'draft';
        $this->is_published = false;
        $this->save();
    }

    /**
     * Archive the article
     */
    public function archive()
    {
        $this->status = 'archived';
        $this->is_published = false;
        if (empty($this->archived_at)) {
            $this->archived_at = now();
        }
        $this->save();
    }

    /**
     * Scope to get only published articles
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->where(function ($q) {
                $q->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            });
    }

    /**
     * Scope to get draft articles
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Scope to get archived articles
     */
    public function scopeArchived($query)
    {
        return $query->where('status', 'archived');
    }

    /**
     * Scope to get featured articles
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope to get pinned articles
     */
    public function scopePinned($query)
    {
        return $query->where('is_pinned', true);
    }

    /**
     * Scope to include global and organization articles
     */
    public function scopeForOrganization($query, $organizationId = null)
    {
        // All articles are global now (organization_id = NULL)
        return $query->whereNull('organization_id');
    }

    /**
     * Scope to filter by visibility
     */
    public function scopeVisibleTo($query, $user = null, $hasStaffPermission = false)
    {
        return $query->where(function ($q) use ($user, $hasStaffPermission) {
            // Public articles are visible to everyone
            $q->where('visibility', 'public');
            
            // Org users can see org_users articles if authenticated
            if ($user) {
                $q->orWhere('visibility', 'org_users');
            }
            
            // Staff can see staff_only articles
            if ($hasStaffPermission) {
                $q->orWhere('visibility', 'staff_only');
            }
        });
    }

    /**
     * Scope for full-text search with ranking
     */
    public function scopeSearch($query, $searchTerm)
    {
        if (empty($searchTerm)) {
            return $query;
        }

        return $query->whereRaw(
            "to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || content) @@ plainto_tsquery('english', ?)",
            [$searchTerm]
        )
        ->orderByRaw(
            "ts_rank(to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || content), plainto_tsquery('english', ?)) DESC",
            [$searchTerm]
        );
    }

    /**
     * Get search snippet (excerpt around search term)
     */
    public function getSearchSnippet($searchTerm, $length = 200)
    {
        if (empty($searchTerm)) {
            return $this->excerpt ?: substr(strip_tags($this->content), 0, $length);
        }

        // Simple snippet: find first occurrence and extract surrounding text
        $content = strip_tags($this->content);
        $pos = stripos($content, $searchTerm);
        
        if ($pos === false) {
            return $this->excerpt ?: substr($content, 0, $length);
        }

        $start = max(0, $pos - ($length / 2));
        $snippet = substr($content, $start, $length);
        
        if ($start > 0) {
            $snippet = '...' . $snippet;
        }
        if (strlen($content) > $start + $length) {
            $snippet = $snippet . '...';
        }

        return $snippet;
    }
}
