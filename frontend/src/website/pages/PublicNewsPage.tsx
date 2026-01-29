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
    excerpt?: string | null;
    content_json?: any;
    published_at?: string | null;
    seo_image_path?: string | null;
    seo_image_url?: string | null;
    created_at?: string | null;
}

interface WebsiteAnnouncement {
    id: string;
    title: string;
    content?: string | null;
    published_at?: string | null;
    created_at?: string | null;
    is_pinned?: boolean;
}

export default function PublicNewsPage({ type }: { type?: 'article' | 'announcement' }) {
    const [page, setPage] = useState(1);
    const isAnnouncements = type === 'announcement';
    const { data: postsData, isLoading } = useQuery({
        queryKey: [isAnnouncements ? 'public-announcements' : 'public-posts', page],
        queryFn: async () => {
            const response = isAnnouncements
                ? await publicWebsiteApi.getAnnouncements(page)
                : await publicWebsiteApi.getPosts(page);

            if (typeof response === 'object' && response !== null && 'data' in response) {
                return response as { data: any[]; last_page?: number };
            }
            return {
                data: Array.isArray(response) ? response : [],
                last_page: 1,
            };
        }
    });

    const posts = postsData?.data || [];
    const totalPages = postsData?.last_page || 1;

    // Filter logic can remain if we eventually support filtering by type on backend.
    // For now we just display what we get.

    const pageTitle = type === 'article' ? 'Articles & Blog' : isAnnouncements ? 'Announcements' : 'News & Updates';
    const pageDescription = type === 'article'
        ? 'Read our latest articles, thoughts, and educational content.'
        : isAnnouncements
            ? 'Official announcements from our school community.'
            : 'Stay updated with the latest happenings, events, and announcements from our school community.';

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-x-hidden">
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
                            {posts.map((post: WebsitePost | WebsiteAnnouncement) => (
                                <Card key={post.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                                    <CardHeader className="p-0 overflow-hidden">
                                        <div className="aspect-video w-full bg-slate-100 relative group">
                                            {!isAnnouncements && (post as WebsitePost).seo_image_path ? (
                                                <img
                                                    src={(post as WebsitePost).seo_image_url || (post as WebsitePost).seo_image_path || ''}
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
                                                {formatDate((post as WebsitePost).published_at || post.created_at)}
                                            </div>
                                            {isAnnouncements && (post as WebsiteAnnouncement).is_pinned && (
                                                <div className="absolute top-4 right-4 bg-amber-500/90 text-white text-xs px-2 py-1 rounded backdrop-blur border border-amber-400/50 shadow-sm">
                                                    Pinned
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-6 pt-6">
                                        <CardTitle className="mb-2 line-clamp-2 hover:text-emerald-700 transition-colors">
                                            <Link to={getDetailLink(type, post as WebsitePost, post as WebsiteAnnouncement)}>
                                                {post.title}
                                            </Link>
                                        </CardTitle>
                                        <CardDescription className="line-clamp-3 mb-4">
                                            {isAnnouncements ? (post as WebsiteAnnouncement).content : (post as WebsitePost).excerpt}
                                        </CardDescription>
                                    </CardContent>
                                    <CardFooter className="p-6 pt-0 mt-auto">
                                        <Button variant="ghost" className="p-0 h-auto text-emerald-600 hover:text-emerald-700 hover:bg-transparent" asChild>
                                            <Link to={getDetailLink(type, post as WebsitePost, post as WebsiteAnnouncement)} className="flex items-center group/btn">
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

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getDetailLink(
    type: 'article' | 'announcement' | undefined,
    post: WebsitePost,
    announcement: WebsiteAnnouncement
) {
    if (type === 'announcement') {
        return `/public-site/announcements/${announcement.id}`;
    }
    return `/public-site/articles/${post.slug}`;
}
