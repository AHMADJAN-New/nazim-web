import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { PublicPageHeader } from '@/website/components/PublicPageHeader';
import { Button } from '@/components/ui/button';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Search, HelpCircle, ChevronRight, MessageCircle, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PublicHeroBackground } from '@/website/components/PublicHeroBackground';

export default function PublicFatwasPage() {
    const { t } = useLanguage();
    const { category: categoryParam, slug } = useParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Debounce search query to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Determine category slug: use category param if available, otherwise check if slug is a category
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['public-fatwa-categories'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getFatwaCategories();
            return (response as any).data || response;
        }
    });

    // Flatten categories to check if slug is a category
    const allCategories = useMemo(() => {
        const flattenCategories = (cats: any[]): any[] => {
            const result: any[] = [];
            cats.forEach(cat => {
                result.push(cat);
                if (cat.children && cat.children.length > 0) {
                    result.push(...flattenCategories(cat.children));
                }
            });
            return result;
        };
        return flattenCategories(categories);
    }, [categories]);

    // Determine category slug: use category param if available, otherwise check if slug is a category
    const categorySlug = useMemo(() => {
        if (categoryParam) return categoryParam;
        if (slug && allCategories.find((c: any) => c.slug === slug)) {
            return slug;
        }
        return null;
    }, [categoryParam, slug, allCategories]);

    const [page, setPage] = useState(1);
    const { data: fatwasData, isLoading: isLoadingFatwas } = useQuery({
        queryKey: ['public-fatwas', categorySlug, debouncedSearchQuery, page],
        queryFn: async () => {
            const response = await publicWebsiteApi.getFatwas({
                category: categorySlug || undefined,
                search: debouncedSearchQuery.trim() || undefined,
                page: page
            });
            return (response as any).data || response;
        },
        enabled: !isLoadingCategories,
    });

    const fatwas = fatwasData?.data || [];
    const totalPages = fatwasData?.last_page || 1;

    // Toggle category expansion
    const toggleCategory = (catId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    if (isLoadingCategories || isLoadingFatwas) {
        return (
            <div className="flex-1 flex items-center justify-center py-20 overflow-x-hidden">
                <LoadingSpinner />
            </div>
        );
    }

    // Backend handles search, so we just use the fatwas as returned
    // (backend filters by question_title, question_text, answer_text, and category name)
    const filteredFatwas = fatwas;

    // Recursive category renderer
    const renderCategories = (cats: any[], depth = 0) => {
        return (
            <div className={cn("space-y-1", depth > 0 && "ml-4 border-l border-slate-200 pl-2")}>
                {cats.map((cat: any) => {
                    const hasChildren = cat.children && cat.children.length > 0;
                    const isExpanded = expandedCategories[cat.id];
                    const isActive = categorySlug === cat.slug;

                    return (
                        <div key={cat.id}>
                            <div className="flex items-center justify-between group">
                                <Link
                                    to={`/public-site/fatwas/${cat.slug}`}
                                    className={cn(
                                        "flex-1 py-2 text-sm transition-colors hover:text-emerald-700 block",
                                        isActive ? "text-emerald-700 font-medium" : "text-slate-600"
                                    )}
                                >
                                    {cat.name}
                                </Link>
                                {hasChildren && (
                                    <button
                                        onClick={(e) => toggleCategory(cat.id, e)}
                                        className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                            {hasChildren && isExpanded && (
                                <div className="mt-1">
                                    {renderCategories(cat.children, depth + 1)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-x-hidden">
            {/* Header */}
            <section className="relative text-white py-16 md:py-24 overflow-hidden">
                <PublicHeroBackground patternOpacity={0.12} />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">{t('websitePublic.fatwasPageTitle')}</h1>
                    <p className="text-emerald-200 max-w-2xl mx-auto mb-8">
                        {t('websitePublic.fatwasPageDescription')}
                    </p>

                    {/* Search */}
                    <div className="max-w-xl mx-auto relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 z-10" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('websitePublic.searchFatwasPlaceholder')}
                            className="pl-10 pr-10 h-12 bg-white/95 border-0 text-slate-900 placeholder:text-slate-500 rounded-lg shadow-lg focus:ring-2 focus:ring-emerald-300"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setDebouncedSearchQuery('');
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                                aria-label={t('websitePublic.clearSearch')}
                            >
                                <span className="text-xl font-bold leading-none">×</span>
                            </button>
                        )}
                        {searchQuery !== debouncedSearchQuery && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar: Categories */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-0 shadow-sm bg-slate-50">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <CardTitle className="text-lg text-slate-800">{t('websitePublic.topics')}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-1">
                                    <Link
                                        to="/public-site/fatwas"
                                        className={cn(
                                            "block py-2 text-sm font-medium transition-colors hover:text-emerald-700",
                                            !categorySlug ? "text-emerald-700" : "text-slate-700"
                                        )}
                                    >
                                        {t('websitePublic.allFatwas')}
                                    </Link>
                                    <div className="pt-2 border-t border-slate-100 mt-2">
                                        {renderCategories(categories)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="bg-emerald-900 rounded-xl p-6 text-white text-center">
                            <MessageCircle className="h-10 w-10 mx-auto mb-4 text-emerald-300" />
                            <h3 className="text-lg font-bold mb-2">{t('websitePublic.haveAQuestion')}</h3>
                            <p className="text-emerald-200 text-sm mb-6">
                                {t('websitePublic.submitQuestionText')}
                            </p>
                            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium" asChild>
                                <Link to="/public-site/fatwas/ask">{t('websitePublic.askAQuestion')}</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Content: List */}
                    <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {debouncedSearchQuery
                                        ? `${t('websitePublic.searchResults')}${categorySlug ? ` ${t('websitePublic.inCategory')} ${allCategories.find((c: any) => c.slug === categorySlug)?.name || t('websitePublic.category')}` : ''}`
                                        : categorySlug
                                            ? (allCategories.find((c: any) => c.slug === categorySlug)?.name || t('websitePublic.filteredResults'))
                                            : t('websitePublic.recentFatwas')
                                    }
                                </h2>
                                {debouncedSearchQuery && (
                                    <p className="text-sm text-slate-500 mt-1">
                                        {t('websitePublic.searchingFor')} <span className="font-medium">"{debouncedSearchQuery}"</span>
                                    </p>
                                )}
                            </div>
                            <Badge variant="outline" className="text-slate-500 flex-shrink-0">
                                {filteredFatwas.length} {filteredFatwas.length === 1 ? t('websitePublic.result') : t('websitePublic.results')}
                            </Badge>
                        </div>

                        {filteredFatwas.length > 0 ? (
                            <div className="space-y-4">
                                {filteredFatwas.map((fatwa: any) => (
                                    <Link key={fatwa.id} to={`/public-site/fatwas/view/${fatwa.slug}`} className="block group">
                                        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-emerald-500">
                                            <CardContent className="p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="shrink-0 mt-1 hidden sm:block">
                                                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                            <BookOpen className="h-5 w-5" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                                                                {fatwa.category?.name || t('websitePublic.general')}
                                                            </Badge>
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(fatwa.published_at || fatwa.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                                                            {fatwa.question_title || fatwa.title}
                                                        </h3>
                                                        <p className="text-slate-600 text-sm line-clamp-2">
                                                            {fatwa.question_text}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-dashed rounded-xl p-12 text-center">
                                <HelpCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 mb-1">{t('websitePublic.noFatwasFound')}</h3>
                                <p className="text-slate-500 mb-6">
                                    {debouncedSearchQuery
                                        ? t('websitePublic.noFatwasMatching', { query: debouncedSearchQuery })
                                        : (categorySlug
                                            ? t('websitePublic.noFatwasInCategory')
                                            : t('websitePublic.noPublishedFatwas'))
                                    }
                                </p>
                                {debouncedSearchQuery && (
                                    <Button variant="outline" onClick={() => {
                                        setSearchQuery('');
                                        setDebouncedSearchQuery('');
                                    }}>
                                        {t('websitePublic.clearSearch')}
                                    </Button>
                                )}
                                {categorySlug && !debouncedSearchQuery && (
                                    <Button variant="outline" asChild className="ml-2">
                                        <Link to="/public-site/fatwas">
                                            {t('websitePublic.viewAllFatwas')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
