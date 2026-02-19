import { HelpCircle } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

// Lazy load react-markdown to reduce initial bundle size
const ReactMarkdown = lazy(() => import('react-markdown'));
import remarkGfm from 'remark-gfm';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';

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
        showToast.info(t('helpCenter.noArticleFound') || 'No help article found for this page. Opening Help Center...');
      }
    }
  }, [isOpen, isLoading, error, article, data, t]);

  // Show toast on error
  useEffect(() => {
    if (isOpen && error && !isLoading) {
      showToast.error(t('helpCenter.errorLoading') || 'Error loading help article');
    }
  }, [isOpen, error, isLoading, t]);

  const handleOpenHelpCenter = () => {
    if (article?.id) {
      // Use ID-based URL for article access
      navigate(`/help-center/article/${article.id}`);
      setIsOpen(false);
    } else if (article?.category?.slug && article?.slug) {
      // Fallback to slug-based URL if ID is not available
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
      showToast.info(t('helpCenter.noArticleFound') || 'No help article found for this page. Opening Help Center...');
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        title={t('helpCenter.contextualHelp') || 'Get help'}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('helpCenter.contextualHelp') || 'Help'}</SheetTitle>
            <SheetDescription>
              {article
                ? t('helpCenter.articleFound') || 'Here is the help article for this page'
                : t('helpCenter.noArticleFound') || 'No specific help article found for this page'}
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
                <p className="mb-4">{t('helpCenter.errorLoading') || 'Error loading help article'}</p>
                <Button onClick={() => navigate('/help-center')} variant="outline">
                  {t('helpCenter.browseHelpCenter') || 'Browse Help Center'}
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
                    <Suspense fallback={<LoadingSpinner />}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children, ...props }) => (
                            <div className="my-3 overflow-x-auto rounded border border-border">
                              <table className="w-full min-w-[300px] border-collapse text-sm" {...props}>
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children, ...props }) => (
                            <th className="border border-border bg-muted/50 px-3 py-1.5 text-start font-semibold" {...props}>
                              {children}
                            </th>
                          ),
                          td: ({ children, ...props }) => (
                            <td className="border border-border px-3 py-1.5 text-start" {...props}>
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {article.content}
                      </ReactMarkdown>
                    </Suspense>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {article.published_at && (
                      <span>
                        {t('events.published') || 'Published'}: {formatDate(new Date(article.published_at))}
                      </span>
                    )}
                  </div>
                  <Button onClick={handleOpenHelpCenter} variant="outline" size="sm">
                    {t('helpCenter.viewFullArticle') || 'View Full Article'}
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !error && !article && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t('helpCenter.noArticleFound') || 'No specific help article found for this page'}
                </p>
                <Button onClick={() => navigate('/help-center')} variant="outline">
                  {t('helpCenter.browseHelpCenter') || 'Browse Help Center'}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

