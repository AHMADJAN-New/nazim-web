import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

interface ContextualHelpButtonProps {
  contextKey?: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ContextualHelpButton({
  contextKey,
  className,
  variant = 'ghost',
  size = 'sm',
}: ContextualHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, error } = useContextualHelp(contextKey);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const article = data?.article;

  // Show toast when no article is found (when sheet opens and data is loaded)
  useEffect(() => {
    if (isOpen && !isLoading && !error && !article && data) {
      // Only show toast if no article was found (match_type === 'none')
      if (data.match_type === 'none') {
        showToast.info(t('help.noArticleFound') || 'No help article found for this page. Opening Help Center...');
      }
    }
  }, [isOpen, isLoading, error, article, data, t]);

  // Show toast on error
  useEffect(() => {
    if (isOpen && error && !isLoading) {
      showToast.error(t('help.errorLoading') || 'Error loading help article');
    }
  }, [isOpen, error, isLoading, t]);

  const handleOpenHelpCenter = () => {
    if (article?.category?.slug && article?.slug) {
      navigate(`/help-center/s/${article.category.slug}/${article.slug}`);
      setIsOpen(false);
    } else {
      navigate('/help-center');
      setIsOpen(false);
    }
  };

  const handleClick = () => {
    setIsOpen(true);
    // If we already have data and no article, show toast immediately
    if (!isLoading && !error && !article && data?.match_type === 'none') {
      showToast.info(t('help.noArticleFound') || 'No help article found for this page. Opening Help Center...');
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        title={t('help.contextualHelp') || 'Get help'}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('help.contextualHelp') || 'Help'}</SheetTitle>
            <SheetDescription>
              {article
                ? t('help.articleFound') || 'Here is the help article for this page'
                : t('help.noArticleFound') || 'No specific help article found for this page'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">{t('help.errorLoading') || 'Error loading help article'}</p>
                <Button onClick={() => navigate('/help-center')} variant="outline">
                  {t('help.browseHelpCenter') || 'Browse Help Center'}
                </Button>
              </div>
            )}

            {!isLoading && !error && article && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{article.title}</h2>
                  {article.category && (
                    <Badge variant="secondary" className="mb-2">
                      {article.category.name}
                    </Badge>
                  )}
                  {article.excerpt && (
                    <p className="text-muted-foreground mb-4">{article.excerpt}</p>
                  )}
                </div>

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {article.content_type === 'html' ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: article.content }}
                      className="help-content"
                    />
                  ) : (
                    <ReactMarkdown>{article.content}</ReactMarkdown>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {article.published_at && (
                      <span>
                        {t('common.published') || 'Published'}: {formatDate(new Date(article.published_at))}
                      </span>
                    )}
                  </div>
                  <Button onClick={handleOpenHelpCenter} variant="outline" size="sm">
                    {t('help.viewFullArticle') || 'View Full Article'}
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !error && !article && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t('help.noArticleFound') || 'No specific help article found for this page'}
                </p>
                <Button onClick={() => navigate('/help-center')} variant="outline">
                  {t('help.browseHelpCenter') || 'Browse Help Center'}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

