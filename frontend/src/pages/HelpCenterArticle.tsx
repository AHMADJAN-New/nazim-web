import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useHelpCenterArticle,
  useMarkArticleHelpful,
  useMarkArticleNotHelpful,
  useHelpCenterArticles,
} from '@/hooks/useHelpCenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Tag,
  BookOpen,
  Share2,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';
import ReactMarkdown from 'react-markdown';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import { showToast } from '@/lib/toast';

export default function HelpCenterArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false);
  const [hasMarkedNotHelpful, setHasMarkedNotHelpful] = useState(false);

  const { data: article, isLoading } = useHelpCenterArticle(id || null);
  const markHelpful = useMarkArticleHelpful();
  const markNotHelpful = useMarkArticleNotHelpful();

  // Get related articles
  const { data: relatedArticles = [] } = useHelpCenterArticles({
    is_published: true,
    category_id: article?.category_id,
    limit: 5,
  });

  const filteredRelatedArticles = relatedArticles
    .filter(a => a.id !== article?.id)
    .slice(0, 4);

  const handleMarkHelpful = async () => {
    if (!id || hasMarkedHelpful) return;
    try {
      await markHelpful.mutateAsync(id);
      setHasMarkedHelpful(true);
      showToast.success(t('helpCenter.thankYou') || 'Thank you for your feedback!');
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleMarkNotHelpful = async () => {
    if (!id || hasMarkedNotHelpful) return;
    try {
      await markNotHelpful.mutateAsync(id);
      setHasMarkedNotHelpful(true);
      showToast.success(t('helpCenter.thankYou') || 'Thank you for your feedback!');
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || '',
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      showToast.success(t('helpCenter.linkCopied') || 'Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">
              {t('helpCenter.articleNotFound') || 'Article not found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t('helpCenter.articleNotFoundDescription') || 'The article you are looking for does not exist or has been removed.'}
            </p>
            <Button onClick={() => navigate('/help-center')}>
              {t('helpCenter.backToHelpCenter') || 'Back to Help Center'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/help-center')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('helpCenter.backToHelpCenter') || 'Back to Help Center'}
      </Button>

      {/* Article Header */}
      <Card className="mb-6">
        {article.featured_image_url && (
          <div className="h-64 bg-muted rounded-t-lg overflow-hidden">
            <img
              src={article.featured_image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {article.category && (
                  <Badge variant="secondary">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {article.category.name}
                  </Badge>
                )}
                {article.is_featured && (
                  <Badge variant="default">
                    Featured
                  </Badge>
                )}
                {article.is_pinned && (
                  <Badge variant="outline">
                    Pinned
                  </Badge>
                )}
              </div>
              <CardTitle className="text-3xl mb-4">{article.title}</CardTitle>
              {article.excerpt && (
                <p className="text-lg text-muted-foreground mb-4">{article.excerpt}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-shrink-0"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {t('helpCenter.share') || 'Share'}
            </Button>
          </div>

          {/* Article Meta */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
            {article.author && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{article.author.full_name}</span>
              </div>
            )}
            {article.published_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatDate(new Date(article.published_at))}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{article.view_count} {t('helpCenter.views') || 'views'}</span>
            </div>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Article Content */}
      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {article.content_type === 'markdown' ? (
              <ReactMarkdown>{article.content}</ReactMarkdown>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('helpCenter.wasThisHelpful') || 'Was this article helpful?'}
          </h3>
          <div className="flex items-center gap-4">
            <Button
              variant={hasMarkedHelpful ? 'default' : 'outline'}
              onClick={handleMarkHelpful}
              disabled={hasMarkedHelpful || hasMarkedNotHelpful}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              {t('helpCenter.yes') || 'Yes'} ({article.helpful_count})
            </Button>
            <Button
              variant={hasMarkedNotHelpful ? 'default' : 'outline'}
              onClick={handleMarkNotHelpful}
              disabled={hasMarkedHelpful || hasMarkedNotHelpful}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              {t('helpCenter.no') || 'No'} ({article.not_helpful_count})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Related Articles */}
      {filteredRelatedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('helpCenter.relatedArticles') || 'Related Articles'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredRelatedArticles.map((relatedArticle) => (
                <div
                  key={relatedArticle.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => navigate(`/help-center/article/${relatedArticle.id}`)}
                >
                  <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold line-clamp-1">{relatedArticle.title}</h4>
                    {relatedArticle.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {relatedArticle.excerpt}
                      </p>
                    )}
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground flex-shrink-0 rotate-180" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

