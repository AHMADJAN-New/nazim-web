import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { PublicPageHeader } from '@/website/components/PublicPageHeader';

interface WebsitePost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content_json: any;
    published_at: string;
    seo_image_path?: string;
    created_at: string;
}

export default function PublicNewsPage({ type }: { type?: 'article' | 'announcement' }) {
    const [page, setPage] = useState(1);
    const { data: postsData, isLoading } = useQuery({
        queryKey: ['public-posts', page],
        queryFn: async () => {
            const response = await publicWebsiteApi.getPosts(page);
            return (response as any).data || response;
        }
    });

    const posts = postsData?.data || [];
    const totalPages = postsData?.last_page || 1;

    // Filter logic can remain if we eventually support filtering by type on backend.
    // For now we just display what we get.

    const pageTitle = type === 'article' ? 'Articles & Blog' : 'News & Announcements';
    const pageDescription = type === 'article'
        ? 'Read our latest articles, thoughts, and educational content.'
        : 'Stay updated with the latest happenings, events, and announcements from our school community.';

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="flex-1">
            {/* Header */}
            <PublicPageHeader
                title={pageTitle}
                description={pageDescription}
            />

            {/* List */}
            <section className="container mx-auto px-4 py-12 md:py-16">
                {posts.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map((post: WebsitePost) => (
                                <Card key={post.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                                    <CardHeader className="p-0 overflow-hidden">
                                        <div className="aspect-video w-full bg-slate-100 relative group">
                                            {post.seo_image_path ? (
                                                <img
                                                    src={post.seo_image_path}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <ImageIcon className="h-12 w-12" />
                                                </div>
                                            )}
                                            <div className="absolute top-4 left-4 bg-emerald-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur border border-emerald-500/50 flex items-center gap-1.5 shadow-sm">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(post.published_at || post.created_at)}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-6 pt-6">
                                        <CardTitle className="mb-2 line-clamp-2 hover:text-emerald-700 transition-colors">
                                            <Link to={`/public-site/${type === 'article' ? 'articles' : 'announcements'}/${post.slug}`}>
                                                {post.title}
                                            </Link>
                                        </CardTitle>
                                        <CardDescription className="line-clamp-3 mb-4">
                                            {post.excerpt}
                                        </CardDescription>
                                    </CardContent>
                                    <CardFooter className="p-6 pt-0 mt-auto">
                                        <Button variant="ghost" className="p-0 h-auto text-emerald-600 hover:text-emerald-700 hover:bg-transparent" asChild>
                                            <Link to={`/public-site/${type === 'article' ? 'articles' : 'announcements'}/${post.slug}`} className="flex items-center group/btn">
                                                Read More
                                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex justify-center dir-ltr">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setPage(Math.max(1, page - 1))}
                                                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                        {/* Simple numeric pagination for now */}
                                        <PaginationItem>
                                            <PaginationLink isActive>{page}</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed text-slate-500">
                        <p className="text-lg mb-2">No updates available at the moment.</p>
                        <p className="text-sm text-slate-400">Please check back later.</p>
                    </div>
                )}
            </section>
        </div>
    );
}

function formatDate(dateStr: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
