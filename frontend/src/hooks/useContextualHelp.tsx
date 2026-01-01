import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { helpCenterArticlesApi } from '@/lib/api/client';
import type * as HelpCenterApi from '@/types/api/helpCenter';

interface ContextualHelpResult {
  article: HelpCenterApi.HelpCenterArticle | null;
  match_type: 'context_key' | 'route_pattern' | 'category_fallback' | 'none';
  message?: string;
}

/**
 * Hook to fetch contextual help article based on current route and context
 */
export const useContextualHelp = (contextKey?: string) => {
  const location = useLocation();
  const route = location.pathname;

  return useQuery<ContextualHelpResult>({
    queryKey: ['contextual-help', route, contextKey],
    queryFn: async () => {
      try {
        const result = await helpCenterArticlesApi.getByContext({
          route,
          context: contextKey,
        });
        return result as ContextualHelpResult;
      } catch (error: any) {
        // 404 is expected when no help article is found - return gracefully
        if (error?.status === 404 || error?.response?.status === 404) {
          return {
            article: null,
            match_type: 'none',
            message: 'No contextual help article found',
          };
        }
        // For other errors, also return gracefully (don't throw)
        // This prevents error UI and allows toast messages instead
        return {
          article: null,
          match_type: 'none',
          message: error?.message || 'Error loading help article',
        };
      }
    },
    enabled: !!route || !!contextKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 404
    throwOnError: false, // Don't throw errors, return gracefully
  });
};

